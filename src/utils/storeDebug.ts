/** 为 store action 生成带命名空间的前缀，用于 devtools 追踪 */
export function setNamespace(ns: string): (action: string) => string {
  return (action: string) => `${ns}/${action}`;
}
