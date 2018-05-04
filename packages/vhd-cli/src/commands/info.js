import Vhd from 'vhd-lib'
import { getHandler } from '@xen-orchestra/fs'
import { resolve } from 'path'

export default async args => {
  const vhd = new Vhd(getHandler({ url: 'file:///' }), resolve(args[0]))

  await vhd.readHeaderAndFooter()

  console.log(vhd.header)
  console.log(vhd.footer)
}
