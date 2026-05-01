import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, type JWTPayload } from './auth'

export type ApiHandler = (
  request: NextRequest,
  context: { user: JWTPayload }
) => Promise<NextResponse>

/**
 * Middleware to protect API routes - requires authenticated user
 */
export function withAuth(handler: ApiHandler) {
  return async (request: NextRequest) => {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return handler(request, { user })
  }
}

/**
 * Middleware to protect API routes - requires specific roles
 */
export function withRole(allowedRoles: string[], handler: ApiHandler) {
  return async (request: NextRequest) => {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return handler(request, { user })
  }
}

/**
 * Middleware to protect API routes - requires staff or admin
 */
export function withStaff(handler: ApiHandler) {
  return withRole(['staff', 'admin'], handler)
}

/**
 * Middleware to protect API routes - requires admin only
 */
export function withAdmin(handler: ApiHandler) {
  return withRole(['admin'], handler)
}

/**
 * Validates API key for external integrations
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const validApiKey = process.env.SPEEDWALLETS_API_KEY
  
  if (!validApiKey) {
    console.warn('SPEEDWALLETS_API_KEY not set')
    return false
  }
  
  return apiKey === validApiKey
}

/**
 * Middleware to protect API routes with API key
 */
export function withApiKey(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }
    
    return handler(request)
  }
}
