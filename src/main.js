import "./style.css"

import * as THREE from "three"
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js"

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Example cube
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 0.2),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
)
scene.add(cube)

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