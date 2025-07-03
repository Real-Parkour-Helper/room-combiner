import "./style.css"

import * as THREE from "three"
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js"

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

camera.position.set(0, 1.6, 5)

// Controls
const controls = new PointerLockControls(camera, document.body)

document.addEventListener("click", () => controls.lock())

const move = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
  faster: false
}

document.addEventListener("keydown", (e) => {
  if (controls.isLocked) {
    e.preventDefault()

    switch (e.code) {
      case "KeyW":
        move.forward = true
        break
      case "KeyS":
        move.backward = true
        break
      case "KeyA":
        move.left = true
        break
      case "KeyD":
        move.right = true
        break
      case "Space":
        move.up = true
        break
      case "ShiftLeft":
        move.down = true
        break
      case "ControlLeft":
        move.faster = !move.faster // toggle
        break
    }
  }
})

document.addEventListener("keyup", (e) => {
  if (controls.isLocked) {
    e.preventDefault()

    switch (e.code) {
      case "KeyW":
        move.forward = false
        break
      case "KeyS":
        move.backward = false
        break
      case "KeyA":
        move.left = false
        break
      case "KeyD":
        move.right = false
        break
      case "Space":
        move.up = false
        break
      case "ShiftLeft":
        move.down = false
        break
    }
  }
})

const clock = new THREE.Clock()

function animate() {
  const delta = clock.getDelta()
  const speed = move.faster ? 10 : 3 // units per second
  const velocity = speed * delta

  if (controls.isLocked) {
    const dir = new THREE.Vector3()

    if (move.forward) dir.z += 1
    if (move.backward) dir.z -= 1
    if (move.left) dir.x -= 1
    if (move.right) dir.x += 1

    dir.normalize()

    // Forward/backward/strafe movement
    if (dir.lengthSq() > 0) {
      controls.moveRight(dir.x * velocity)
      controls.moveForward(dir.z * velocity)
    }

    // Up/down (fly)
    if (move.up) camera.position.y += velocity
    if (move.down) camera.position.y -= velocity
  }

  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()

//////////////////////////////////
// Room loading
//////////////////////////////////

import { bindRoomUploader } from "./roomLoading.js"
import { blockColors } from "./blockColors.js"

const roomGroup = new THREE.Group()
scene.add(roomGroup)

let roomPalette = {}
let roomBlocks = []

const blockScale = 0.2

const swapKeyValue = (object) =>
  Object.entries(object).reduce((swapped, [key, value]) => (
    { ...swapped, [value]: key }
  ), {})

function spawnCube(x, y, z, color) {
  const geometry = new THREE.BoxGeometry(blockScale, blockScale, blockScale)
  const material = new THREE.MeshBasicMaterial({ color })
  const cube = new THREE.Mesh(geometry, material)
  cube.position.set(x * blockScale, y * blockScale, z * blockScale)
  roomGroup.add(cube)
}

function clearRoom() {
  roomGroup.clear()
}

function renderRoom() {
  const reversePalette = swapKeyValue(roomPalette)

  // Collect blocks by type
  const blockGroups = {}
  roomBlocks.forEach(block => {
    const blockName = reversePalette[block.id]
    const color = blockColors[blockName]

    if (!color) {
      console.warn(`No color found for block ID: ${block.id}`)
      return
    }

    if (!blockGroups[blockName]) blockGroups[blockName] = []
    blockGroups[blockName].push(block)
  })

  // For each block type, create one InstancedMesh
  Object.entries(blockGroups).forEach(([blockName, blocks]) => {
    const color = blockColors[blockName]
    const material = new THREE.MeshBasicMaterial({ color })
    const geometry = new THREE.BoxGeometry(blockScale, blockScale, blockScale)
    const instancedMesh = new THREE.InstancedMesh(geometry, material, blocks.length)

    const dummy = new THREE.Object3D()

    blocks.forEach((block, i) => {
      dummy.position.set(
        block.x * blockScale,
        block.y * blockScale,
        block.z * blockScale
      )
      dummy.updateMatrix()
      instancedMesh.setMatrixAt(i, dummy.matrix)
    })

    roomGroup.add(instancedMesh)
  })
}

bindRoomUploader(document.getElementById("import"), (roomData) => {
  roomPalette = roomData.palette
  roomBlocks = roomData.blocks

  clearRoom()
  renderRoom()
})