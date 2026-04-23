const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vrcxInsights', {
  getAppState: () => ipcRenderer.invoke('app:get-state'),
  chooseDataDirectory: () => ipcRenderer.invoke('app:choose-data-directory'),
  updateDataDirectory: (dataDir) => ipcRenderer.invoke('app:update-data-directory', { dataDir }),
  openExternalUrl: (url) => ipcRenderer.invoke('app:open-external-url', { url }),
  openDevTools: () => ipcRenderer.invoke('app:open-devtools'),
  resolveWorldNames: (worldIds = []) => ipcRenderer.invoke('app:resolve-world-names', { worldIds }),
  getMeta: () => ipcRenderer.invoke('insights:get-meta'),
  reload: () => ipcRenderer.invoke('insights:reload'),
  getAcquaintances: (query = {}) => ipcRenderer.invoke('insights:get-acquaintances', query),
  getTimeline: (query = {}) => ipcRenderer.invoke('insights:get-timeline', query),
  getRelationshipTop: (query = {}) => ipcRenderer.invoke('insights:get-relationship-top', query),
  getMutualFriends: (query = {}) => ipcRenderer.invoke('insights:get-mutual-friends', query),
  getMutualFriendDetail: (query = {}) => ipcRenderer.invoke('insights:get-mutual-friend-detail', query),
  getRelationshipPair: (query = {}) => ipcRenderer.invoke('insights:get-relationship-pair', query)
});
