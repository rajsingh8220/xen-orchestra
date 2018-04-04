/* eslint-env jest */

import execa from 'execa'
import { exec } from 'child-process-promise'
import { createReadStream, createWriteStream } from 'fs-promise'

import { readRawContent } from './vmdk-read'
import { VHDFile, convertFromVMDK, computeGeometryForSize } from './vhd-write'

jest.setTimeout(10000)

test('VMDK to VHD can convert a random data file with readRawContent()', async () => {
  const inputRawFileName = 'random-data.raw'
  const vmdkFileName = 'random-data.vmdk'
  const vhdFileName = 'from-vmdk-readRawContent.vhd'
  const reconvertedRawFilemane = 'from-vhd.raw'
  const dataSize = 5222400
  await exec(
    'rm -f ' +
      [
        inputRawFileName,
        vmdkFileName,
        vhdFileName,
        reconvertedRawFilemane,
      ].join(' ')
  )
  await exec(
    'base64 /dev/urandom | head -c ' + dataSize + ' > ' + inputRawFileName
  )
  await exec(
    'python /usr/share/pyshared/VMDKstream.py ' +
      inputRawFileName +
      ' ' +
      vmdkFileName
  )
  const rawContent = (await readRawContent(createReadStream(vmdkFileName)))
    .rawFile
  const f = new VHDFile(rawContent.length, 523557791)
  await f.writeBuffer(rawContent)
  await f.writeFile(vhdFileName)
  await execa('vhd-util', ['check', '-p', '-b', '-t', '-n', vhdFileName])
  await exec(
    'qemu-img convert -fvpc -Oraw ' + vhdFileName + ' ' + reconvertedRawFilemane
  )
  return exec('qemu-img compare ' + vmdkFileName + ' ' + vhdFileName).catch(
    error => {
      console.error(error.stdout)
      console.error(error.stderr)
      console.error(vhdFileName, vmdkFileName, error.message)

      throw error
    }
  )
})
test('VMDK to VHD can convert a random data file with VMDKDirectParser', async () => {
  const inputRawFileName = 'random-data.raw'
  const vmdkFileName = 'random-data.vmdk'
  const vhdFileName = 'from-vmdk-VMDKDirectParser.vhd'
  const reconvertedRawFilemane = 'from-vhd.raw'
  const reconvertedByVBoxRawFilemane = 'from-vhd-by-vbox.raw'
  const dataSize = computeGeometryForSize(8 * 1024 * 1024).actualSize
  await exec(
    'rm -f ' +
      [
        inputRawFileName,
        vmdkFileName,
        vhdFileName,
        reconvertedRawFilemane,
        reconvertedByVBoxRawFilemane,
      ].join(' ')
  )
  await exec(
    'base64 /dev/urandom | head -c ' + dataSize + ' > ' + inputRawFileName
  )
  await exec(
    'python /usr/share/pyshared/VMDKstream.py ' +
      inputRawFileName +
      ' ' +
      vmdkFileName
  )
  const pipe = (await convertFromVMDK(createReadStream(vmdkFileName))).pipe(
    createWriteStream(vhdFileName)
  )
  await new Promise((resolve, reject) => {
    pipe.on('finish', resolve)
    pipe.on('error', reject)
  })
  await execa('vhd-util', ['check', '-p', '-b', '-t', '-n', vhdFileName])
  await exec(
    'qemu-img convert -fvmdk -Oraw ' +
      vmdkFileName +
      ' ' +
      reconvertedByVBoxRawFilemane
  )
  await exec(
    'qemu-img convert -fvpc -Oraw ' + vhdFileName + ' ' + reconvertedRawFilemane
  )
  return exec(
    'qemu-img compare ' +
      reconvertedByVBoxRawFilemane +
      ' ' +
      reconvertedRawFilemane
  ).catch(error => {
    console.error(error.stdout)
    console.error(error.stderr)
    console.error(vhdFileName, vmdkFileName, error.message)

    throw error
  })
})