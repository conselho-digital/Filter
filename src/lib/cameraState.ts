/**
 * Estado compartilhado entre CameraRig e WindowViewRig: enquanto a vista da varanda
 * está ativa (ou voltando), só o WindowViewRig mexe na câmera.
 */
export const cameraState = { windowView: false }
