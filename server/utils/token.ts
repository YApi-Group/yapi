import crypto from 'crypto'

import cons from '../cons.js'

/**
 * 复刻 OpenSSL EVP_BytesToKey（MD5、无 salt）的 key/IV 派生。
 * crypto.createCipher/createDecipher 在 Node 22 中被移除，但历史已分发的项目 token
 * 均由 createCipher('aes192', password) 生成，必须保持派生方式一致才能兼容旧 token。
 */
const deriveKeyAndIv = function (password: string) {
  const keyLen = 24 // aes192 密钥长度
  const ivLen = 16
  let material = Buffer.alloc(0)
  let prev = Buffer.alloc(0)
  while (material.length < keyLen + ivLen) {
    prev = crypto
      .createHash('md5')
      .update(Buffer.concat([prev, Buffer.from(password)]))
      .digest()
    material = Buffer.concat([material, prev])
  }
  return {
    key: material.subarray(0, keyLen),
    iv: material.subarray(keyLen, keyLen + ivLen),
  }
}

/** 创建加密算法（等价于已移除的 createCipher('aes192', password)） */
const aseEncode = function (data: string, password: string) {
  const { key, iv } = deriveKeyAndIv(password)
  const cipher = crypto.createCipheriv('aes-192-cbc', key, iv)

  let encrypted = cipher.update(data, 'utf-8', 'hex')
  encrypted += cipher.final('hex')

  return encrypted
}

/** 创建解密算法（等价于已移除的 createDecipher('aes192', password)） */
const aseDecode = function (data: string, password: string) {
  const { key, iv } = deriveKeyAndIv(password)
  const decipher = crypto.createDecipheriv('aes-192-cbc', key, iv)

  let decrypted = decipher.update(data, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')

  return decrypted
}

const defaultSalt = 'abcde'

export function getToken(token: string, uid: string | number) {
  if (!token) {
    throw new Error('token 不能为空')
  }

  cons.WEB_CONFIG.passsalt = cons.WEB_CONFIG.passsalt || defaultSalt
  return aseEncode(uid + '|' + token, cons.WEB_CONFIG.passsalt)
}

export function parseToken(token: string) {
  if (!token) {
    throw new Error('token 不能为空')
  }

  cons.WEB_CONFIG.passsalt = cons.WEB_CONFIG.passsalt || defaultSalt
  let tokens
  try {
    tokens = aseDecode(token, cons.WEB_CONFIG.passsalt)
  } catch (e) {
    /* noop */
  }

  if (tokens && typeof tokens === 'string' && tokens.indexOf('|') > 0) {
    tokens = tokens.split('|')
    return {
      uid: tokens[0],
      projectToken: tokens[1],
    }
  }
  return false
}
