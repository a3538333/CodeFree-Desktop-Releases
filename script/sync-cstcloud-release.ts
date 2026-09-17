#!/usr/bin/env bun

import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

const usage = `Usage: bun script/sync-cstcloud-release.ts <version>

Required environment:
  CSTCLOUD_BUCKET   CSTCloud bucket name

Optional environment:
  CSTCLOUD_REMOTE   rclone remote name (default: cstcloud)
  CSTCLOUD_PREFIX   Folder inside the bucket (default: codefree-desktop)
  RELEASE_REPO      GitHub release repository (default: a3538333/CodeFree-Desktop-Releases)
  KEEP_RELEASES     Number of version folders to retain (default: 3)`

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(usage)
  process.exit(0)
}

const input = process.argv[2]
if (!input) throw new Error(`Version is required\n\n${usage}`)

const tag = input.startsWith("v") ? input : `v${input}`
if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`Invalid release version: ${input}`)

const bucket = Bun.env.CSTCLOUD_BUCKET
if (!bucket) throw new Error(`CSTCLOUD_BUCKET is required\n\n${usage}`)

const remote = Bun.env.CSTCLOUD_REMOTE ?? "cstcloud"
const prefix = Bun.env.CSTCLOUD_PREFIX ?? "codefree-desktop"
const repository = Bun.env.RELEASE_REPO ?? "a3538333/CodeFree-Desktop-Releases"
const keep = Number(Bun.env.KEEP_RELEASES ?? "3")
if (!Number.isSafeInteger(keep) || keep < 1) throw new Error("KEEP_RELEASES must be a positive integer")

const bucketRoot = `${remote}:${bucket}`
const destination = `${bucketRoot}/${prefix}`
const temporary = await mkdtemp(path.join(tmpdir(), "codefree-cstcloud-release-"))
const metadata = await mkdtemp(path.join(tmpdir(), "codefree-cstcloud-metadata-"))
const releaseDirectory = path.join(temporary, prefix, tag)
const metadataDirectory = path.join(metadata, prefix)

try {
  await run(["rclone", "size", bucketRoot])
  await run(["gh", "release", "view", tag, "--repo", repository])
  await mkdir(releaseDirectory, { recursive: true })
  await run(["gh", "release", "download", tag, "--repo", repository, "--dir", releaseDirectory])

  const assets = await Array.fromAsync(new Bun.Glob("*").scan({ cwd: releaseDirectory, onlyFiles: true }))
  if (!assets.length) throw new Error(`GitHub release ${tag} has no downloadable assets`)

  console.log(`Uploading ${tag} to ${destination}/${tag}`)
  await run([
    "rclone",
    "copy",
    temporary,
    bucketRoot,
    "--include",
    `/${prefix}/${tag}/**`,
    "--size-only",
    "--progress",
  ])

  // Compare from the bucket root because CSTCloud's web UI creates zero-byte
  // folder markers that rclone otherwise treats as regular files. The updater
  // verifies the selected installer with the SHA-512 value in latest*.yml.
  await run([
    "rclone",
    "check",
    temporary,
    bucketRoot,
    "--include",
    `/${prefix}/${tag}/**`,
    "--size-only",
    "--one-way",
  ])

  const metadataFiles = await Array.fromAsync(
    new Bun.Glob("latest*.yml").scan({ cwd: releaseDirectory, onlyFiles: true }),
  )
  if (!metadataFiles.length) throw new Error(`GitHub release ${tag} has no updater metadata`)
  await mkdir(metadataDirectory, { recursive: true })
  for (const filename of metadataFiles) {
    const content = await Bun.file(path.join(releaseDirectory, filename)).text()
    const rewritten = content
      .split("\n")
      .map((line) => {
        const match = line.match(/^(\s*(?:-\s+url|path):\s+)(.+)$/)
        if (!match) return line
        if (/^https?:\/\//.test(match[2]!)) throw new Error(`${filename} contains an absolute update URL`)
        return `${match[1]}${tag}/${match[2]}`
      })
      .join("\n")
    await Bun.write(path.join(metadataDirectory, filename), rewritten)
  }

  const folders = (await output(["rclone", "lsf", bucketRoot, "--dirs-only", "--recursive"]))
    .split("\n")
    .filter((item) => item.startsWith(`${prefix}/`))
    .map((item) => item.slice(prefix.length + 1).replace(/\/$/, ""))
    .filter((item) => !item.includes("/"))
    .filter((item) => /^v\d+\.\d+\.\d+$/.test(item))
    .sort(compareVersions)

  if (folders[0] === tag) {
    console.log(`Publishing updater metadata for ${tag}`)
    await run(["rclone", "copy", metadata, bucketRoot])
    await run(["rclone", "check", metadata, bucketRoot, "--download", "--one-way"])
  }

  for (const stale of folders.slice(keep)) {
    console.log(`Removing stale CSTCloud release ${stale}`)
    const stalePath = `${destination}/${stale}`
    const stat = JSON.parse(await output(["rclone", "lsjson", stalePath, "--stat"])) as { IsDir?: unknown }
    if (stat.IsDir === false) await run(["rclone", "deletefile", stalePath])
    await run(["rclone", "purge", stalePath])
  }

  console.log(`Synced ${tag}; retained ${Math.min(folders.length, keep)} release folder(s)`)
} finally {
  await Promise.all([
    rm(temporary, { recursive: true, force: true }),
    rm(metadata, { recursive: true, force: true }),
  ])
}

async function run(command: string[]) {
  const process = Bun.spawn(command, { stdin: "inherit", stdout: "inherit", stderr: "inherit" })
  const status = await process.exited
  if (status !== 0) throw new Error(`${command[0]} exited with status ${status}`)
}

async function output(command: string[]) {
  const process = Bun.spawn(command, { stdout: "pipe", stderr: "inherit" })
  const text = await new Response(process.stdout).text()
  const status = await process.exited
  if (status !== 0) throw new Error(`${command[0]} exited with status ${status}`)
  return text
}

function compareVersions(left: string, right: string) {
  const leftParts = left.slice(1).split(".").map(Number)
  const rightParts = right.slice(1).split(".").map(Number)
  return rightParts[0] - leftParts[0] || rightParts[1] - leftParts[1] || rightParts[2] - leftParts[2]
}
