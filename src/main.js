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

renderer.domElement.addEventListener("click", () => {
  controls.lock()
})

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

const importedRooms = []
const blockScale = 0.2

const swapKeyValue = (object) =>
  Object.entries(object).reduce((swapped, [key, value]) => (
    { ...swapped, [value]: key }
  ), {})

function addRoomToTable(roomIndex, roomName, dimensions) {
  const tbody = document.querySelector("#room-table tbody")
  const tr = document.createElement("tr")
  tr.dataset.roomIndex = roomIndex

  tr.innerHTML = `
    <td>${roomName}</td>
    <td><input type="text" value="0-${dimensions.width - 1}"></td>
    <td><input type="text" value="0-${dimensions.height - 1}"></td>
    <td><input type="text" value="0-${dimensions.depth - 1}"></td>
    <td><button class="remove-room">Remove</button></td>
  `

  tbody.appendChild(tr)

  tr.querySelector(".remove-room").addEventListener("click", () => {
    removeRoom(roomIndex)
  })
}

function removeRoom(roomIndex) {
  // Remove room from importedRooms
  importedRooms.splice(roomIndex, 1)

  // Remove table row
  const row = document.querySelector(`#room-table tbody tr[data-room-index="${roomIndex}"]`)
  if (row) row.remove()

  // Update remaining room indices in both importedRooms and table
  const rows = document.querySelectorAll("#room-table tbody tr")
  rows.forEach((row, i) => {
    row.dataset.roomIndex = i
    importedRooms[i].name = `Room ${i + 1}`
    row.querySelector("td").textContent = `Room ${i + 1}`
  })

  clearRoom()
}

function clearRoom() {
  roomGroup.clear()
}

function renderBlocks(blocks) {
  clearRoom()

  const blockGroups = {}

  blocks.forEach(block => {
    const room = importedRooms[block.sourceRoomIndex]
    const reversePalette = swapKeyValue(room.palette)
    const blockName = reversePalette[block.id]
    const color = blockColors[blockName]

    if (!color) {
      console.warn(`No color found for block ID ${block.id} in room ${block.sourceRoomIndex}`)
      return
    }

    const groupKey = `${block.sourceRoomIndex}:${blockName}`

    if (!blockGroups[groupKey]) {
      blockGroups[groupKey] = {
        color,
        blocks: []
      }
    }

    blockGroups[groupKey].blocks.push(block)
  })

  Object.entries(blockGroups).forEach(([key, { color, blocks }]) => {
    const baseColor = new THREE.Color(color)
    const geometry = new THREE.BoxGeometry(blockScale, blockScale, blockScale)
    const material = new THREE.MeshBasicMaterial({ color })
    const instancedMesh = new THREE.InstancedMesh(geometry, material, blocks.length)

    instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(blocks.length * 3), 3
    )

    const dummy = new THREE.Object3D()

    blocks.forEach((block, i) => {
      dummy.position.set(
        block.x * blockScale,
        block.y * blockScale,
        block.z * blockScale
      )
      dummy.updateMatrix()
      instancedMesh.setMatrixAt(i, dummy.matrix)

      const brightness = (((block.x + block.y + block.z) % 2 === 0) ? 1.2 : 1.0) + Math.random() * 0.1
      const adjustedColor = baseColor.clone().multiplyScalar(brightness)

      instancedMesh.instanceColor.setXYZ(i, adjustedColor.r, adjustedColor.g, adjustedColor.b)
    })

    instancedMesh.instanceColor.needsUpdate = true
    roomGroup.add(instancedMesh)
  })
}

function getMergeRegionsFromTable() {
  const rows = document.querySelectorAll("#room-table tbody tr")
  const regions = []

  rows.forEach((row, i) => {
    const inputs = row.querySelectorAll("input")
    const [xRange, yRange, zRange] = Array.from(inputs).map(input => {
      const [min, max] = input.value.split("-").map(Number)
      return { min, max }
    })

    regions.push({
      sourceRoomIndex: i,
      area: {
        xMin: xRange.min,
        xMax: xRange.max,
        yMin: yRange.min,
        yMax: yRange.max,
        zMin: zRange.min,
        zMax: zRange.max,
      }
    })
  })

  return regions
}

function mergeRooms(importedRooms, mergeRegions) {
  const merged = []

  mergeRegions.forEach(region => {
    const room = importedRooms[region.sourceRoomIndex]
    room.blocks.forEach(block => {
      const { x, y, z } = block
      if (
        x >= region.area.xMin && x <= region.area.xMax &&
        y >= region.area.yMin && y <= region.area.yMax &&
        z >= region.area.zMin && z <= region.area.zMax
      ) {
        merged.push({
          ...block,
          sourceRoomIndex: region.sourceRoomIndex
        })
      }
    })
  })

  return merged
}

function exportMergedRoom() {
  const mergeRegions = getMergeRegionsFromTable()
  const mergedBlocks = mergeRooms(importedRooms, mergeRegions)

  // Build a new palette and remap IDs
  const combinedPalette = {}
  let nextId = 0

  const blockNameToNewId = {}

  mergedBlocks.forEach(block => {
    const room = importedRooms[block.sourceRoomIndex]
    const reversePalette = swapKeyValue(room.palette)
    const blockName = reversePalette[block.id]

    if (!(blockName in blockNameToNewId)) {
      blockNameToNewId[blockName] = nextId
      combinedPalette[blockName] = nextId
      nextId++
    }

    block.id = blockNameToNewId[blockName]
    block._blockName = blockName // keep for meta
    delete block.sourceRoomIndex // remove internal field
  })

  // Create merged room JSON
  const mergedRoom = {
    palette: combinedPalette,
    blocks: mergedBlocks.map(({ _blockName, ...rest }) => rest)
  }

  downloadJson(mergedRoom, "blocks.json")

  // Create meta.json
  const checkpoints = mergedBlocks
    .filter(block => block._blockName === "minecraft:light_weighted_pressure_plate")
    .map(block => ({ x: block.x, y: block.y, z: block.z }))

  const meta = {
    name: "merged",
    width: 37,
    height: 47,
    depth: 57,
    checkpoints
  }

  downloadJson(meta, "meta.json")
}


function downloadJson(obj, filename) {
  const json = JSON.stringify(obj)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()

  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
}

bindRoomUploader(document.getElementById("import"), (roomData) => {
  const roomIndex = importedRooms.length
  const roomName = `Room ${roomIndex + 1}`

  importedRooms.push({
    name: roomName,
    palette: roomData.palette,
    blocks: roomData.blocks,
    dimensions: {
      width: 37,
      height: 47,
      depth: 57
    }
  })

  addRoomToTable(roomIndex, roomName, importedRooms[roomIndex].dimensions)
})

document.getElementById("render").addEventListener("click", () => {
  const mergeRegions = getMergeRegionsFromTable()
  const mergedBlocks = mergeRooms(importedRooms, mergeRegions)

  clearRoom()
  renderBlocks(mergedBlocks)
})

document.getElementById("export").addEventListener("click", exportMergedRoom)