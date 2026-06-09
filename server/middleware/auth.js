// ==================== JWT 认证中间件 ====================
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'edu-ai-teacher-secret-change-in-production'
const JWT_EXPIRES_IN = '7d'

/** 签发 JWT Token */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/** 验证 JWT Token */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

/**
 * 认证中间件 — 不强制拦截，仅解析 token 附加用户信息到 req.user
 * 未登录用户 req.user = null，由各路由自行判断是否需要登录
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null
    return next()
  }

  const token = authHeader.split(' ')[1]
  try {
    req.user = verifyToken(token)
  } catch (err) {
    // token 过期或无效，不阻断请求，仅标记未登录
    req.user = null
  }
  next()
}

/**
 * 强制登录中间件 — 未登录返回 401
 * 用于需要登录的操作（如反馈提交、模板上传等）
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: '请先登录后再操作' })
  }
  next()
}
