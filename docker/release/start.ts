/**
 * 容器启动引导脚本（参考 fjc0k/docker-YApi 的镜像逻辑，按本仓库架构重写）。
 *
 * 编译为 CommonJS 的 /yapi/start.js，作为容器入口，职责：
 * 1. 汇总配置：内置默认值 <- /yapi/config.js 或 /yapi/config.json（用户挂载）<- YAPI_* 环境变量
 * 2. 将最终配置写入 /yapi/vendors/config.json（服务端 server/cons.ts 固定从该文件读取）
 * 3. 启动引导页服务，在 YApi 就绪前展示启动日志
 * 4. 等待 MongoDB 端口可用
 * 5. 首次启动时执行数据库初始化（server/install.js，成功后生成 init.lock）
 * 6. 通过 tsx 启动 YApi 服务端（与开发环境 nodemon 的 execMap 行为一致）
 *
 * 注：原 docker-YApi 支持启动时按配置安装 yapi 插件，本仓库的插件动态加载机制
 * 正在重新设计（见 server/app.js 中被注释的 plugin 逻辑），故未保留该能力。
 */
import childProcess from 'child_process'
import fs from 'fs'
import http from 'http'
import path from 'path'

const VENDORS_DIR = '/yapi/vendors'
const SERVER_DIR = path.join(VENDORS_DIR, 'server')

// ==== 辅助函数 ====
class Helper {
  /**
   * 简单的 CONSTANT_CASE 实现。
   */
  static constCase(str: string): string {
    return str.replace(/(?<=[a-z])(?=[A-Z])/g, '_').toUpperCase()
  }

  /**
   * 是否是假值。
   */
  static isFalsy(value: string): boolean {
    return ['false', 'False', 'FALSE', 'off', 'Off', 'OFF', 'no', 'No', 'NO', '0'].includes(value)
  }

  /**
   * 是否是普通对象。
   */
  static isPlainObject(value: any): value is Record<string, any> {
    return value != null && typeof value === 'object' && !Array.isArray(value)
  }

  /**
   * 深合并两个对象，source 覆盖 target，返回新对象。
   */
  static deepMerge<T = Record<string, any>>(target: any, source: any): T {
    const result: Record<string, any> = { ...(target || {}) }
    for (const [key, value] of Object.entries(source || {})) {
      result[key] =
        Helper.isPlainObject(value) && Helper.isPlainObject(result[key])
          ? Helper.deepMerge(result[key], value)
          : value
    }
    return result as T
  }

  /**
   * 递归遮盖配置中的敏感字段，用于日志输出。
   */
  static maskSecrets<T>(value: T): T {
    if (!Helper.isPlainObject(value)) return value
    const result: Record<string, any> = {}
    for (const [key, item] of Object.entries(value)) {
      result[key] =
        /pass|password|secret|token/i.test(key) && typeof item === 'string'
          ? '******'
          : Helper.maskSecrets(item)
    }
    return result as T
  }

  /**
   * 执行 shell 命令。
   */
  static async exec(
    cmd: string,
    log?: (message: string) => any,
  ): Promise<{ error?: Error; stdout: string; stderr: string; cmd: string; code?: number }> {
    return new Promise(resolve => {
      const child = childProcess.spawn('sh', ['-c', `set -e\n${cmd}`], { stdio: 'pipe' })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', data => {
        log && log(String(data))
        stdout += data
      })

      child.stderr.on('data', data => {
        log && log(String(data))
        stderr += data
      })

      child.on('error', error => {
        resolve({ error, stdout, stderr, cmd })
      })

      child.on('close', code => {
        resolve({ stdout, stderr, cmd, code: code == null ? undefined : code })
      })
    })
  }
}

// ==== 配置解析 ====
// 配置格式与环境变量映射规则沿用 docker-YApi：
// 嵌套字段按 CONSTANT_CASE 用下划线连接并加 YAPI_ 前缀，
// 如 db.servername -> YAPI_DB_SERVERNAME，mail.auth.user -> YAPI_MAIL_AUTH_USER
const configShape = {
  adminAccount: String,
  adminPassword: String, // 管理员密码：仅在首次初始化数据库时生效
  closeRegister: Boolean,
  port: Number,
  timeout: Number,
  db: {
    servername: String,
    port: Number,
    DATABASE: String,
    user: String,
    pass: String,
    connectString: String,
    authSource: String,
    options: JSON,
  },
  mail: {
    enable: Boolean,
    host: String,
    port: Number,
    from: String,
    auth: {
      user: String,
      pass: String,
    },
    // 传递给 NodeMailer 的额外参数，ref: https://nodemailer.com/smtp/
    options: JSON,
  },
  ldapLogin: {
    enable: Boolean,
    server: String,
    baseDn: String,
    bindPassword: String,
    searchDn: String,
    searchStandard: String,
    emailPostfix: String,
    emailKey: String,
    usernameKey: String,
  },
} as const

type IConfigShape = typeof configShape

type GetType<T extends Record<any, any>> = {
  -readonly [K in keyof T]?: T[K] extends StringConstructor
    ? string
    : T[K] extends BooleanConstructor
      ? boolean
      : T[K] extends NumberConstructor
        ? number
        : T[K] extends Record<any, any>
          ? GetType<T[K]>
          : any
}

export type IConfig = GetType<IConfigShape>

// 内置默认值，可被挂载的配置文件与环境变量覆盖
const defaultConfig: IConfig = {
  port: 3000,
  adminAccount: 'admin@admin.com',
  adminPassword: 'ymfe.org',
  closeRegister: false,
  timeout: 120000,
  db: {
    servername: 'mongo',
    port: 27017,
    DATABASE: 'yapi',
    authSource: '',
  },
}

class ConfigParser {
  /**
   * 从用户挂载的文件获取配置（/yapi/config.js 优先于 /yapi/config.json）。
   */
  static extractConfigFromFile(): IConfig {
    return fs.existsSync('/yapi/config.js')
      ? require('/yapi/config.js')
      : fs.existsSync('/yapi/config.json')
        ? JSON.parse(fs.readFileSync('/yapi/config.json').toString())
        : {}
  }

  /**
   * 从环境变量获取配置。
   */
  static extractConfigFromEnv(
    configCtx = {},
    shapeCtx = configShape as Record<string, any>,
    envPath = ['YAPI'],
  ): IConfig {
    for (const [key, shape] of Object.entries(shapeCtx)) {
      const KEY = Helper.constCase(key)
      if (Array.isArray(shape) || (shape as any) === JSON || typeof shape === 'function') {
        const envKey = envPath.concat(KEY).join('_')
        const envValue = process.env[envKey]
        if (envValue != null) {
          ;(configCtx as any)[key] =
            shape === Boolean
              ? !Helper.isFalsy(envValue)
              : Array.isArray(shape) || (shape as any) === JSON
                ? JSON.parse(envValue.trim())
                : (shape as any)(envValue)
        }
      } else {
        if ((configCtx as any)[key] == null) {
          ;(configCtx as any)[key] = {}
        }
        ConfigParser.extractConfigFromEnv((configCtx as any)[key], shape as any, envPath.concat(KEY))
      }
    }
    return configCtx as any
  }

  /**
   * 获取最终配置：默认值 <- 文件 <- 环境变量。
   */
  static extractConfig(): IConfig {
    const configFromFile = ConfigParser.extractConfigFromFile()
    const configFromEnv = ConfigParser.extractConfigFromEnv()
    let config = Helper.deepMerge<IConfig>(defaultConfig, configFromFile)
    config = Helper.deepMerge<IConfig>(config, configFromEnv)
    // 端口固定为 3000，但支持通过环境变量 PORT 改变
    // 注: Heroku 等平台必须使用 PORT 环境变量
    Object.assign(config, {
      port: Number(process.env.PORT) || config.port || 3000,
    })
    return config
  }
}

// ==== 引导服务 ====
class BootstrapServer {
  server!: http.Server

  logs: string[] = []

  constructor(private port: number) {}

  log(message: string) {
    this.logs.push(message)
  }

  open() {
    this.server = http.createServer((req, res) => {
      res.setHeader('Connection', 'close')
      if (/\/logs$/.test(req.url || '')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(this.logs))
      } else {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>YApi</title>
            </head>
            <body>
              <h1>YApi 正在启动...</h1>
              <hr />
              <pre id="data"></pre>
              <script>
                function fetchData() {
                  var timer = setTimeout(fetchData, 500)
                  fetch('./logs')
                    .then(function (res) {
                      return res.json()
                    })
                    .then(function (data) {
                      document.querySelector('#data').innerHTML = data.join('\\n')
                    })
                    .catch(function () {
                      clearTimeout(timer)
                      setTimeout(function () { location.reload() }, 2000)
                    })
                }
                fetchData()
              </script>
            </body>
          </html>
        `)
      }
    })
    this.server.listen(this.port)
  }

  async close(): Promise<any> {
    return new Promise(resolve => {
      this.server.close(resolve)
    })
  }
}

// ==== 入口 ====
class Main {
  private config: IConfig

  private bootstrapServer: BootstrapServer

  constructor() {
    this.config = ConfigParser.extractConfig()
    this.bootstrapServer = new BootstrapServer(this.config.port!)
  }

  log(message: string, sendToClient: boolean = false) {
    console.log(message)
    if (sendToClient) {
      this.bootstrapServer.log(message)
    }
  }

  /**
   * 将最终配置写入服务端实际读取的位置（server/cons.ts 读取 WEB_ROOT/config.json）。
   */
  writeConfig(config: IConfig) {
    const finalConfig: IConfig = JSON.parse(JSON.stringify(config))
    // mail.options 为 docker-YApi 扩展字段，摊平后传给 NodeMailer
    if (finalConfig.mail && finalConfig.mail.options) {
      const mailOptions = finalConfig.mail.options
      delete finalConfig.mail.options
      finalConfig.mail = Helper.deepMerge(finalConfig.mail, mailOptions)
    }
    fs.writeFileSync(path.join(VENDORS_DIR, 'config.json'), JSON.stringify(finalConfig, null, 2))
  }

  /**
   * 等待 MongoDB 服务可用。
   */
  async waitMongoDBAvailable() {
    // 使用数据库集群（connectString）时跳过检测
    if (this.config.db && this.config.db.connectString) return
    await Helper.exec(`
      until nc -z ${this.config.db!.servername} ${this.config.db!.port || 27017}
      do
        sleep 0.5
      done
    `)
  }

  /**
   * 首次启动时初始化数据库（创建管理员账号与索引）。
   */
  async installIfNeeded() {
    if (fs.existsSync(path.join(VENDORS_DIR, 'init.lock'))) {
      this.log('检测到 init.lock，跳过数据库初始化', true)
      return
    }
    const result = await Helper.exec(`cd ${SERVER_DIR} && node --import tsx install.js`, message =>
      this.log(message, true),
    )
    if (result.code !== 0) {
      // 初始化失败不阻塞启动：数据库可能已由更早的容器初始化过（init.lock 未持久化）
      this.log(`数据库初始化未完成（退出码 ${result.code}），若非首次启动可忽略`, true)
    }
  }

  /**
   * 启动 YApi 服务端并转发退出信号。
   */
  startServer() {
    const child = childProcess.spawn('node', ['--import', 'tsx', 'app.js'], {
      cwd: SERVER_DIR,
      stdio: 'inherit',
    })
    for (const signal of ['SIGTERM', 'SIGINT'] as const) {
      process.on(signal, () => child.kill(signal))
    }
    child.on('exit', (code, signal) => {
      process.exit(code != null ? code : signal ? 1 : 0)
    })
  }

  async start() {
    this.log('启动引导服务...', true)
    this.bootstrapServer.open()

    this.log('写入配置...', true)
    this.log(JSON.stringify(Helper.maskSecrets(this.config), null, 2))
    this.writeConfig(this.config)

    this.log('等待 MongoDB 服务可用...', true)
    await this.waitMongoDBAvailable()

    this.log('初始化数据库（如已初始化会自动跳过）...', true)
    await this.installIfNeeded()

    this.log('关闭引导服务...', true)
    await this.bootstrapServer.close()

    this.log('启动 YApi 服务端...')
    this.startServer()
  }
}

new Main().start().catch(err => {
  throw err
})
