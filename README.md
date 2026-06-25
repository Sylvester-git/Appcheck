# Android APK 16KB Alignment Checker

A web tool that verifies whether shared libraries (`.so` files) inside an Android APK are 16KB page-aligned — a requirement for Android 15+ devices with 16KB page size support.

## What it does

Upload an `.apk` file and the tool will:

- Extract all ELF shared libraries from the APK
- Check each library's `LOAD` segment alignment via `objdump`
- Report each library as **ALIGNED** (≥ 2\*\*14) or **UNALIGNED**
- Show APK zip-alignment status (requires `zipalign` build-tools ≥ 35.0.0-rc3)
- Display a per-architecture breakdown (`arm64-v8a`, `x86_64`, `armeabi-v7a`, `x86`)

## Requirements

The server running this app must have the following tools on `$PATH`:

- `objdump` — ELF inspection (part of `binutils`)
- `unzip` — APK extraction
- `zipalign` _(optional)_ — zip-alignment check; install via `sdkmanager "build-tools;35.0.0-rc3"`

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then drag and drop an `.apk` file onto the upload zone.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- React 19
- Tailwind CSS 4
- TypeScript 5

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Background

Android 15 introduced support for devices with 16KB memory page sizes. Apps that ship native libraries must ensure those libraries are aligned to 16KB boundaries — otherwise they will fail to load on 16KB-page devices. See the [Android documentation](https://developer.android.com/guide/practices/page-sizes) for details.

The underlying check script is at [scripts/check_elf_alignment.sh](scripts/check_elf_alignment.sh), which can also be run directly:

```bash
./scripts/check_elf_alignment.sh path/to/app.apk
```
