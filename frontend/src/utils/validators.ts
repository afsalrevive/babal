// utils/validators.ts
export const validatePermissions = (pages: Page[], roles: Role[]) => {
  const errors = []
  
  roles.forEach(role => {
    role.perms_metadata.forEach(perm => {
      if (!pages.some(p => p.id === perm.page_id)) {
        errors.push(`Role ${role.name} has invalid page ID: ${perm.page_id}`)
      }
      if (!['none', 'read', 'write'].includes(perm.crud_operation)) {
        errors.push(`Role ${role.name} has invalid operation: ${perm.crud_operation}`)
      }
    })
  })
  
  if (errors.length > 0) {
    console.error('Permission validation errors:', errors)
    return false
  }
  return true
}