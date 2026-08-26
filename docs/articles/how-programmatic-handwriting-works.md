# How programmatic handwriting works without AI

Scribble Lab turns text into handwriting-like pages with JavaScript, vector coordinates, and a seeded pseudo-random number generator. It does not load a model, call an inference service, or learn from handwriting samples.

The interesting part is not randomizing every point. Unrelated random noise looks messy, while exact repetition looks like a font. The renderer needs variation at one level and continuity at another.

## Start with stroke data

The project bundles public-domain Hershey vector alphabets. Each glyph is stored as paths made from coordinate points. Cursive and print use separate constructions.

`src/stroke-font.js` resolves a grapheme to a base character, chooses the right glyph variant, adds supported accent marks, and returns paths plus an advance width. It does not ask the operating system for a handwriting font.

## Build a reproducible writer

The selected seed is hashed and passed into a small pseudo-random number generator. `deriveWriterStyle()` uses that stream to choose overall width, height, shear, rotation, shape variation, motion, and pressure tendencies.

These values are document-level traits. They keep the page from looking like every letter came from a different source. The same seed and settings produce the same traits again.

## Change each glyph instance

Every placed character receives an instance seed based on the document seed, character position, and glyph. The engine scales, bends, shifts, and waves the source points. It also adds small accumulated movement along each path.

Repeated letters still share a recognizable construction, but their point geometry is not identical. The transformation is bounded so that variation does not erase the character.

## Carry state between letters

Natural variation is usually correlated. A baseline drifts over several letters. Pressure changes through a word. Width and rotation move gradually.

The renderer keeps a writer state with horizontal and vertical offset, rotation, width, height, and pressure phase. Each new state blends part of the previous value with a new seeded target. This simple smoothing creates continuity without copying a real person's motion.

## Turn controls into dynamics

Speed, shakiness, grip, wrist support, wrist angle, slant, pressure, and paper type become coefficients for jitter, drift, tracking noise, shear, rotation, and deformation.

The Expected Readability control coordinates several of these settings while leaving letter size under direct user control. At higher levels it increases spacing and stability while reducing motion and cursive deformation that hurt clarity. Seeded writer traits remain active, so maximum readability does not collapse into one fixed font.

## Draw one segment at a time

Canvas 2D traverses each vector path as line segments. Pressure changes line width along the path. A fountain pen also responds to segment direction. Pencil grain, marker layers, ink opacity, and reservoir level affect how segments appear or whether a weak segment is skipped.

Cursive mode can add seeded curved connectors between eligible neighbors. Print mode leaves those connectors out.

The paper renderer draws stock color, subtle fibers, notebook rules, or a grid before the ink is painted. Seeded crumpling, fold, stain, and fire layers can be composed below and above the ink. That foreground phase lets bleaching, deposits, soot, and burn-through obscure parts of a line like damage in a poorly preserved source document. Optional scan simulation then converts the complete page to monochrome and adds quality-dependent loss.

## Lay out and export the document

The importer turns common Markdown into readable text conventions. Grapheme-aware layout keeps combined characters together, preserves explicit line breaks, wraps words, and divides the result into the selected physical page format.

The live preview displays the same page stack used for export, with bounded-resolution secondary pages for large sources. PDF export takes a stable snapshot, renders every page locally at full resolution, and opens the browser print dialog.

## Why this is not AI

There are no trained weights, examples to fit, prompts to interpret, embeddings, model calls, or generated predictions. The output is the direct result of source vector paths and rules written in the code.

Seeded pseudo-random numbers provide controlled variety. They do not make the system a machine-learning model. You can follow the path from input text to final Canvas calls in the repository and reproduce the same result with the same inputs.

That transparent path is useful for developers working on procedural graphics, deterministic testing, local-first tools, accessibility, and privacy-conscious OCR test data.
