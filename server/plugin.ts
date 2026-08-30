import path from 'path'

import { exts } from './common/config.js'
import { initPlugins } from './common/plugin.js'
import cons from './cons.js'
import yapi from './yapi.js'

// const plugin_path = path.join(cons.WEB_ROOT, 'node_modules')
// const plugin_system_path = path.join(cons.WEB_ROOT, 'exts')

// const pluginsConfig = initPlugins(cons.WEB_CONFIG.plugins, 'plugin')
// pluginsConfig.forEach(plugin => {
//   if (!plugin || plugin.enable === false || plugin.server === false) {
//     return null
//   }

//   if (!yapi.commons.fileExist(path.join(plugin_path, 'yapi-plugin-' + plugin.name + '/server.js'))) {
//     throw new Error(`config.json配置了插件${plugin},但plugins目录没有找到此插件，请安装此插件`)
//   }

//   const pluginModule = require(path.join(plugin_path, 'yapi-plugin-' + plugin.name + '/server.js'))
//   pluginModule.call(yapi, plugin.options)
// })

// const extConfig = initPlugins(exts, 'ext')

// extConfig.forEach(plugin => {
//   if (!plugin || plugin.enable === false || plugin.server === false) {
//     return null
//   }

//   if (!yapi.commons.fileExist(path.join(plugin_system_path, 'yapi-plugin-' + plugin.name + '/server.js'))) {
//     throw new Error(`config.json配置了插件${plugin},但plugins目录没有找到此插件，请安装此插件`)
//   }

//   const pluginModule = require(path.join(plugin_system_path, 'yapi-plugin-' + plugin.name + '/server.js'))
//   pluginModule.call(yapi, plugin.options)
// })
