export { pool, initDB } from "./pool";
export type { StoredDocument, StoredChunk } from "./documents";
export {
  storeDocument,
  searchSimilar,
  searchHybrid,
  listDocuments,
  deleteDocument,
  getDocumentChunks,
} from "./documents";
export type { StoredConversation } from "./conversations";
export {
  createConversation,
  listConversations,
  getConversation,
  getConversationByThreadId,
  deleteConversation,
  updateConversation,
} from "./conversations";
export type { StoredMessage } from "./messages";
export { addMessage, getMessages, deleteMessagePair, rewindToMessage, getMessagesAsLangChain } from "./messages";
export type { StoredUser } from "./users";
export { createUser, getUserByEmail, getUserById, updateUser, updatePassword } from "./users";
export type { StoredMemory } from "./memories";
export { saveMemory, deleteMemory, listMemories, searchMemories, searchMemoriesSemantic, searchMemoriesHybrid } from "./memories";
