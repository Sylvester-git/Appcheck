#!/bin/bash
progname="${0##*/}"
progname="${progname%.sh}"

# usage: check_elf_alignment.sh [path to *.so files|path to *.apk]

cleanup_trap() {
  if [ -n "${tmp}" -a -d "${tmp}" ]; then
    rm -rf ${tmp}
  fi
  exit $1
}

usage() {
  echo "Host side script to check the ELF alignment of shared libraries."
  echo "Shared libraries are reported ALIGNED when their ELF regions are"
  echo "16 KB or 64 KB aligned. Otherwise they are reported as UNALIGNED."
  echo
  echo "Usage: ${progname} [input-path|input-APK|input-APEX]"
}

if [ ${#} -ne 1 ]; then
  usage
  exit
fi

case ${1} in
  --help | -h | -\?)
    usage
    exit
    ;;

  *)
    dir="${1}"
    ;;
esac

if ! [ -f "${dir}" -o -d "${dir}" ]; then
  echo "Invalid file: ${dir}" >&2
  exit 1
fi

if [[ "${dir}" == *.apk ]]; then
  trap 'cleanup_trap' EXIT

  echo
  echo "Recursively analyzing $dir"
  echo

  if { zipalign --help 2>&1 | grep -q "\-P <pagesize_kb>"; }; then
    echo "=== APK zip-alignment ==="
    zipalign -v -c -P 16 4 "${dir}" | grep -E 'lib/.*\.so|Verification'
    echo "========================="
  elif command -v python3 >/dev/null 2>&1; then
    echo "=== APK zip-alignment ==="
    python3 - "${dir}" << 'PYEOF'
import struct, sys, zipfile

def check_zip_alignment(apk_path):
    PAGE_ALIGN = 16 * 1024
    all_ok = True
    checked = 0
    with open(apk_path, 'rb') as raw:
        with zipfile.ZipFile(apk_path, 'r') as zf:
            for info in zf.infolist():
                name = info.filename
                if not (name.startswith('lib/') and name.endswith('.so')):
                    continue
                raw.seek(info.header_offset + 26)
                fname_len, extra_len = struct.unpack('<HH', raw.read(4))
                data_offset = info.header_offset + 30 + fname_len + extra_len
                checked += 1
                ok = (data_offset % PAGE_ALIGN) == 0
                if not ok:
                    all_ok = False
                print(f"  {name} (offset 0x{data_offset:08x}) {'OK' if ok else 'FAILED'}")
    if checked == 0:
        print("  No native libraries found in lib/arm64-v8a or lib/x86_64")
    elif all_ok:
        print("Verification successful")
    else:
        print("Verification FAILED")

check_zip_alignment(sys.argv[1])
PYEOF
    echo "========================="
  else
    echo "NOTICE: Zip alignment check requires build-tools version 35.0.0-rc3 or higher."
    echo "  You can install the latest build-tools by running the below command"
    echo "  and updating your \$PATH:"
    echo
    echo "    sdkmanager \"build-tools;35.0.0-rc3\""
  fi

  dir_filename=$(basename "${dir}")
  tmp=$(mktemp -d -t "${dir_filename%.apk}_out_XXXXX")
  python3 - "${dir}" "${tmp}" << 'PYEOF'
import sys, zipfile, os
apk_path, out_dir = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(apk_path) as zf:
    for name in zf.namelist():
        if name.startswith('lib/') and name.endswith('.so'):
            dest = os.path.join(out_dir, name)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with zf.open(name) as src, open(dest, 'wb') as dst:
                dst.write(src.read())
PYEOF
  dir="${tmp}"
fi

if [[ "${dir}" == *.apex ]]; then
  trap 'cleanup_trap' EXIT

  echo
  echo "Recursively analyzing $dir"
  echo

  dir_filename=$(basename "${dir}")
  tmp=$(mktemp -d -t "${dir_filename%.apex}_out_XXXXX")
  deapexer extract "${dir}" "${tmp}" || { echo "Failed to deapex." && exit 1; }
  dir="${tmp}"
fi

RED="\e[31m"
GREEN="\e[32m"
ENDCOLOR="\e[0m"

unaligned_libs=()

echo
echo "=== ELF alignment ==="

matches="$(find "${dir}" -type f)"
IFS=$'\n'
for match in $matches; do
  # We could recursively call this script or rewrite it to though.
  [[ "${match}" == *".apk" ]] && echo "WARNING: doesn't recursively inspect .apk file: ${match}"
  [[ "${match}" == *".apex" ]] && echo "WARNING: doesn't recursively inspect .apex file: ${match}"

  python3 -c "import sys; f=open(sys.argv[1],'rb'); sys.exit(0 if f.read(4)==b'\x7fELF' else 1)" "${match}" 2>/dev/null || continue

  res="$(python3 - "${match}" 2>/dev/null << 'PYEOF'
import struct, sys, math
def get_load_align(path):
    with open(path, 'rb') as f:
        ident = f.read(16)
        if ident[:4] != b'\x7fELF':
            return
        bits = 64 if ident[4] == 2 else 32
        f.seek(0)
        if bits == 64:
            hdr = f.read(64)
            e_phoff = struct.unpack_from('<Q', hdr, 32)[0]
            e_phentsize = struct.unpack_from('<H', hdr, 54)[0]
            e_phnum = struct.unpack_from('<H', hdr, 56)[0]
        else:
            hdr = f.read(52)
            e_phoff = struct.unpack_from('<I', hdr, 28)[0]
            e_phentsize = struct.unpack_from('<H', hdr, 42)[0]
            e_phnum = struct.unpack_from('<H', hdr, 44)[0]
        for i in range(e_phnum):
            f.seek(e_phoff + i * e_phentsize)
            ph = f.read(e_phentsize)
            p_type = struct.unpack_from('<I', ph)[0]
            p_align = struct.unpack_from('<Q', ph, 48)[0] if bits == 64 else struct.unpack_from('<I', ph, 28)[0]
            if p_type == 1:
                print(f"2**{int(math.log2(p_align))}" if p_align > 1 else "2**0")
                return
get_load_align(sys.argv[1])
PYEOF
)"
  if [[ $res =~ 2\*\*(1[4-9]|[2-9][0-9]|[1-9][0-9]{2,}) ]]; then
    echo -e "${match}: ${GREEN}ALIGNED${ENDCOLOR} ($res)"
  else
    echo -e "${match}: ${RED}UNALIGNED${ENDCOLOR} ($res)"
    unaligned_libs+=("${match}")
  fi
done

if [ ${#unaligned_libs[@]} -gt 0 ]; then
  echo -e "${RED}Found ${#unaligned_libs[@]} unaligned libs (only arm64-v8a/x86_64 libs need to be aligned).${ENDCOLOR}"
elif [ -n "${dir_filename}" ]; then
  echo -e "ELF Verification Successful"
fi
echo "====================="
