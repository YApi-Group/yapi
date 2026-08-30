export default function createContext(uid, projectId, interfaceId) {
  if (!uid || !projectId || !interfaceId) {
    console.error('uid projectId interfaceId 不能为空', uid, projectId, interfaceId)
  }

  /**
   * 统一转换为number
   */
  return {
    uid: Number(uid),
    projectId: Number(projectId),
    interfaceId: Number(interfaceId),
  }
}
