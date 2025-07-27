/// <reference types="vite/client" />

// Vue files handling
declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// @ alias
declare module '@/*'

// JWT decode types
declare module 'jwt-decode' {
  interface JwtPayload {
    perms: string[]
    is_admin: boolean
    session_version: number
  }
  
  export function jwtDecode<T>(token: string): T 

}