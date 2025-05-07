"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, ImageIcon, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function DiceArtPlanner() {
  const [image, setImage] = useState<string | null>(null)
  const [gridSize, setGridSize] = useState(20)
  const [blurAmount, setBlurAmount] = useState(0)
  const [diceArt, setDiceArt] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [totalDice, setTotalDice] = useState(0)
  const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 })

  // Thresholds represent the dividing points between dice values (0-1)
  // We need 5 dividers to create 6 regions for dice values 1-6
  const [thresholds, setThresholds] = useState([0.17, 0.33, 0.5, 0.67, 0.83])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)
  const gradientRef = useRef<HTMLDivElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        if (event.target?.result) {
          setImage(event.target.result as string)
          setDiceArt(null)
        }
      }

      reader.readAsDataURL(file)
    }
  }

  const processImage = () => {
    if (!image || !canvasRef.current || !outputCanvasRef.current) return

    setIsProcessing(true)

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = image

    img.onload = () => {
      // Set up processing canvas
      const canvas = canvasRef.current!
      const ctx = canvas.getContext("2d")!

      // Calculate dimensions to maintain aspect ratio
      let width = img.width
      let height = img.height
      const maxDimension = 800

      if (width > height && width > maxDimension) {
        height = (height / width) * maxDimension
        width = maxDimension
      } else if (height > width && height > maxDimension) {
        width = (width / height) * maxDimension
        height = maxDimension
      }

      canvas.width = width
      canvas.height = height

      // First draw the image without blur
      ctx.drawImage(img, 0, 0, width, height)

      // Create a temporary canvas for the blurred version
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')!
      tempCanvas.width = width
      tempCanvas.height = height

      // Copy the original image to temp canvas and apply blur
      tempCtx.drawImage(canvas, 0, 0)
      tempCtx.filter = `blur(${blurAmount}px)`
      tempCtx.drawImage(tempCanvas, 0, 0)

      // Copy the blurred version back to main canvas
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(tempCanvas, 0, 0)

      // Reset the filter
      ctx.filter = "none"

      // Calculate cell size based on the smaller dimension to ensure square dice
      const cellSize = Math.min(width / gridSize, height / gridSize)

      // Calculate actual grid dimensions based on cell size
      const actualGridWidth = Math.floor(width / cellSize)
      const actualGridHeight = Math.floor(height / cellSize)

      // Update total dice count and grid dimensions
      setTotalDice(actualGridWidth * actualGridHeight)
      setGridDimensions({ width: actualGridWidth, height: actualGridHeight })

      // Add a small gap between dice (1px in the original scale)
      const gapSize = 1 / 4

      // Calculate offset to center the grid
      const offsetX = (width - actualGridWidth * cellSize) / 2
      const offsetY = (height - actualGridHeight * cellSize) / 2

      // Set up output canvas
      const outputCanvas = outputCanvasRef.current!
      const outputCtx = outputCanvas.getContext("2d")!

      // Make output canvas larger for better visibility
      const scaleFactor = 4
      outputCanvas.width = actualGridWidth * cellSize * scaleFactor
      outputCanvas.height = actualGridHeight * cellSize * scaleFactor

      // Clear output canvas with #666 background
      outputCtx.fillStyle = "#666"
      outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height)

      // Process each cell
      for (let y = 0; y < actualGridHeight; y++) {
        for (let x = 0; x < actualGridWidth; x++) {
          // Get average color of cell
          const cellData = ctx.getImageData(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize)

          const avgColor = getAverageColor(cellData.data)
          const brightness = (avgColor.r * 0.299 + avgColor.g * 0.587 + avgColor.b * 0.114) / 255

          // Map brightness to dice value using thresholds
          const diceValue = getDiceValueFromBrightness(brightness)

          // Draw dice with a small gap
          drawDice(
            outputCtx,
            x * cellSize * scaleFactor + gapSize,
            y * cellSize * scaleFactor + gapSize,
            cellSize * scaleFactor - gapSize * 2,
            cellSize * scaleFactor - gapSize * 2,
            diceValue,
          )
        }
      }

      setDiceArt(outputCanvas.toDataURL("image/png"))
      setIsProcessing(false)
    }
  }

  const getAverageColor = (data: Uint8ClampedArray) => {
    let r = 0,
      g = 0,
      b = 0
    const pixelCount = data.length / 4

    for (let i = 0; i < data.length; i += 4) {
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
    }

    return {
      r: r / pixelCount,
      g: g / pixelCount,
      b: b / pixelCount,
    }
  }

  const getDiceValueFromBrightness = (brightness: number) => {
    // With 5 thresholds, we create 6 regions for dice values 1-6
    // Dice 6 (highest) for brightest areas, Dice 1 (lowest) for darkest areas

    if (brightness >= thresholds[4]) return 6
    if (brightness >= thresholds[3]) return 5
    if (brightness >= thresholds[2]) return 4
    if (brightness >= thresholds[1]) return 3
    if (brightness >= thresholds[0]) return 2
    return 1 // Darkest areas
  }

  const drawDice = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
  ) => {
    // Draw black dice background
    ctx.fillStyle = "#000"
    ctx.fillRect(x, y, width, height)

    // Draw dots based on dice value
    ctx.fillStyle = "#fff"
    const dotRadius = Math.min(width, height) * 0.1
    const centerX = x + width / 2
    const centerY = y + height / 2

    switch (value) {
      case 1:
        // Center dot
        drawDot(ctx, centerX, centerY, dotRadius)
        break
      case 2:
        // Top-left and bottom-right
        drawDot(ctx, x + width * 0.25, y + height * 0.25, dotRadius)
        drawDot(ctx, x + width * 0.75, y + height * 0.75, dotRadius)
        break
      case 3:
        // Top-left, center, and bottom-right
        drawDot(ctx, x + width * 0.25, y + height * 0.25, dotRadius)
        drawDot(ctx, centerX, centerY, dotRadius)
        drawDot(ctx, x + width * 0.75, y + height * 0.75, dotRadius)
        break
      case 4:
        // Four corners
        drawDot(ctx, x + width * 0.25, y + height * 0.25, dotRadius)
        drawDot(ctx, x + width * 0.75, y + height * 0.25, dotRadius)
        drawDot(ctx, x + width * 0.25, y + height * 0.75, dotRadius)
        drawDot(ctx, x + width * 0.75, y + height * 0.75, dotRadius)
        break
      case 5:
        // Four corners and center
        drawDot(ctx, x + width * 0.25, y + height * 0.25, dotRadius)
        drawDot(ctx, x + width * 0.75, y + height * 0.25, dotRadius)
        drawDot(ctx, centerX, centerY, dotRadius)
        drawDot(ctx, x + width * 0.25, y + height * 0.75, dotRadius)
        drawDot(ctx, x + width * 0.75, y + height * 0.75, dotRadius)
        break
      case 6:
        // Six dots (3 on each side)
        drawDot(ctx, x + width * 0.25, y + height * 0.25, dotRadius)
        drawDot(ctx, x + width * 0.25, y + height * 0.5, dotRadius)
        drawDot(ctx, x + width * 0.25, y + height * 0.75, dotRadius)
        drawDot(ctx, x + width * 0.75, y + height * 0.25, dotRadius)
        drawDot(ctx, x + width * 0.75, y + height * 0.5, dotRadius)
        drawDot(ctx, x + width * 0.75, y + height * 0.75, dotRadius)
        break
    }
  }

  const drawDot = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const downloadDiceArt = () => {
    if (!diceArt) return

    const link = document.createElement("a")
    link.href = diceArt
    link.download = "dice-art-plan.png"

    // Set the image quality to maximum when downloading
    if (outputCanvasRef.current) {
      link.href = outputCanvasRef.current.toDataURL("image/png", 1.0)
    }

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDividerDrag = (index: number, newPosition: number) => {
    // Ensure position is between 0 and 1
    newPosition = Math.max(0, Math.min(1, newPosition))

    // Create a copy of current thresholds
    const newThresholds = [...thresholds]

    // Update the threshold at the specified index
    newThresholds[index] = newPosition

    // Ensure thresholds don't cross each other
    // Check lower bound (previous threshold)
    if (index > 0 && newThresholds[index] < newThresholds[index - 1]) {
      newThresholds[index] = newThresholds[index - 1]
    }

    // Check upper bound (next threshold)
    if (index < newThresholds.length - 1 && newThresholds[index] > newThresholds[index + 1]) {
      newThresholds[index] = newThresholds[index + 1]
    }

    // Update state
    setThresholds(newThresholds)
  }

  // Handle mouse/touch events for the gradient dividers
  const handleDividerInteractionStart = (index: number) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()

    const gradientEl = gradientRef.current
    if (!gradientEl) return

    const gradientRect = gradientEl.getBoundingClientRect()
    const gradientWidth = gradientRect.width

    // Function to calculate position from mouse or touch event
    const getPositionFromEvent = (clientX: number) => {
      const relativeX = clientX - gradientRect.left
      return Math.max(0, Math.min(1, relativeX / gradientWidth))
    }

    // Mouse event handlers
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newPosition = getPositionFromEvent(moveEvent.clientX)
      handleDividerDrag(index, newPosition)
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    // Touch event handlers
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length > 0) {
        const newPosition = getPositionFromEvent(moveEvent.touches[0].clientX)
        handleDividerDrag(index, newPosition)
      }
    }

    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }

    // Add appropriate event listeners based on event type
    if (e.type === "mousedown") {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    } else if (e.type === "touchstart") {
      document.addEventListener("touchmove", handleTouchMove)
      document.addEventListener("touchend", handleTouchEnd)
    }
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Dice Art Planner</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />

                {image ? (
                  <div className="space-y-4">
                    <div className="relative w-full max-w-xs mx-auto">
                      <img src={image || "/placeholder.svg"} alt="Uploaded" className="w-full h-auto rounded-lg" />
                    </div>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="grid-size">
                      Grid Size: {gridSize}×{gridSize}
                    </Label>
                    {totalDice > 0 && (
                      <span className="text-sm text-gray-600">
                        Total Dice: {totalDice} ({gridDimensions.width}×{gridDimensions.height})
                      </span>
                    )}
                  </div>
                  <Slider
                    id="grid-size"
                    min={5}
                    max={100}
                    step={1}
                    value={[gridSize]}
                    onValueChange={(value) => setGridSize(value[0])}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="blur-amount">Blur Amount: {blurAmount}px</Label>
                  </div>
                  <Slider
                    id="blur-amount"
                    min={0}
                    max={100}
                    step={0.5}
                    value={[blurAmount]}
                    onValueChange={(value) => setBlurAmount(value[0])}
                  />
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label className="font-medium">Dice Value Mapping</Label>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag the dividers to adjust which brightness levels map to each dice value
                  </p>

                  {/* Gradient with draggable dividers */}
                  <div className="mt-6 mb-2">
                    <div
                      ref={gradientRef}
                      className="relative h-12 w-full rounded-md bg-gradient-to-r from-black to-white"
                    >
                      {/* Dividers with knobs for better touch interaction */}
                      {thresholds.map((threshold, index) => (
                        <>
                          {/* Vertical Divider Line */}
                          <div
                            className="absolute top-0 bottom-0 w-1 bg-red-500 -translate-x-1/2 pointer-events-none"
                            style={{ left: `${threshold * 100}%` }}
                            aria-hidden="true"
                          />
                          {/* Draggable Knob */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing touch-none"
                            style={{ left: `${threshold * 100}%` }}
                            onMouseDown={handleDividerInteractionStart(index)}
                            onTouchStart={handleDividerInteractionStart(index)}
                            aria-label={`Threshold for dice value ${index + 2}`}
                          />
                        </>
                      ))}

                      {/* Dice value labels */}
                      <div className="absolute -bottom-6 left-0 text-xs">1</div>
                      <div
                        className="absolute -bottom-6 text-xs"
                        style={{ left: `${(thresholds[1] * 100 + thresholds[0] * 100) / 2}%` }}
                      >
                        2
                      </div>
                      <div
                        className="absolute -bottom-6 text-xs"
                        style={{ left: `${(thresholds[2] * 100 + thresholds[1] * 100) / 2}%` }}
                      >
                        3
                      </div>
                      <div
                        className="absolute -bottom-6 text-xs"
                        style={{ left: `${(thresholds[3] * 100 + thresholds[2] * 100) / 2}%` }}
                      >
                        4
                      </div>
                      <div
                        className="absolute -bottom-6 text-xs"
                        style={{ left: `${(thresholds[4] * 100 + thresholds[3] * 100) / 2}%` }}
                      >
                        5
                      </div>
                      <div
                        className="absolute -bottom-6 text-xs"
                        style={{ left: `${(100 + thresholds[4] * 100) / 2}%` }}
                      >
                        6
                      </div>
                    </div>
                    <div className="flex justify-between text-xs mt-8 text-gray-500">
                      <span>Dark</span>
                      <span>Bright</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={processImage} disabled={!image || isProcessing}>
                {isProcessing ? "Processing..." : "Generate Dice Art Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              {diceArt ? (
                <div className="space-y-4 w-full">
                  <div className="overflow-auto max-h-[500px] border rounded-lg">
                    <img src={diceArt || "/placeholder.svg"} alt="Dice Art" className="w-full h-auto" />
                  </div>
                  <Button variant="outline" className="w-full" onClick={downloadDiceArt}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Dice Art Plan
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-500 flex flex-col items-center">
                  <ImageIcon className="h-16 w-16 mb-4" />
                  <p>Your dice art plan will appear here</p>
                  <p className="text-sm mt-2">Upload an image and adjust settings to generate</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden canvas elements for image processing */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={outputCanvasRef} className="hidden" />

      <div className="mt-8 bg-gray-100 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Upload an image </li>
          <li>Adjust the grid size to determine how many dice will be used (higher = more detail)</li>
          <li>Adjust the blur amount to smooth out details if needed</li>
          <li>Drag the red dividers on the gradient to customize which brightness levels map to each dice value</li>
          <li>Click "Generate Dice Art Plan" to process the image</li>
          <li>The result shows how to arrange black dice with white dots to recreate your image</li>
          <li>Download the plan to use as a reference for your physical dice art project</li>
        </ol>
        <p className="mt-4 text-sm text-gray-600">
          Note: The app ensures all dice are perfectly square regardless of your image's dimensions. By default,
          brighter areas are represented by higher dice values (more dots), while darker areas use lower dice values.
          You can customize this mapping by dragging the dividers on the gradient.
        </p>
      </div>
    </main>
  )
}
