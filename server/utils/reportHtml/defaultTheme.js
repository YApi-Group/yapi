import fs from 'fs'
import sysPath from 'path'

const css = fs.readFileSync(sysPath.join(__dirname, './defaultTheme.css'))

export default '<style>' + css + '</style>'
