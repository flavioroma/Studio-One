import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PiCollageTool } from './PiCollageTool';
import { LanguageProvider } from '../../contexts/LanguageContext';

// Mock the PersistenceService to prevent IndexedDB errors in tests
vi.mock('../../services/PersistenceService', () => ({
  PersistenceService: {
    loadPiCollageState: vi.fn().mockResolvedValue(null),
    savePiCollageState: vi.fn(),
  },
}));

const renderWithLanguage = (component: React.ReactNode) => {
  return render(<LanguageProvider>{component}</LanguageProvider>);
};

describe('PiCollageTool', () => {
  it('renders the empty state drop zone initially', async () => {
    renderWithLanguage(<PiCollageTool />);

    // Check if the "Add Images" text or icon is present
    expect(screen.queryByText('1. Background music')).toBeNull(); // Should not have SlideSync texts

    // We expect the default state to prompt for images
    expect(screen.getByText('Add Images')).toBeInTheDocument();
  });
});

describe('PiCollage Aspect Ratio & Export Regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly calculates image aspectRatio during upload', async () => {
    // We need to provide a mock for URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'test-url');

    renderWithLanguage(<PiCollageTool />);

    // The input is hidden, so we find it by its type
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['(⌐□_□)'], 'test.png', { type: 'image/png' });

    // Trigger upload
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for the image to be processed
    await waitFor(
      () => {
        // Find the image by alt text
        const images = screen.getAllByAltText('Collage Piece');
        expect(images.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    const piece = screen.getAllByAltText('Collage Piece')[0].closest('.transform-gpu');
    // Our mock in vitest.setup.ts returns width=1920, height=1080 -> AR = 1.777...
    expect(piece).toHaveStyle({ aspectRatio: '1.7777777777777777' });
  });

  it('updates preview container sizing when aspect ratio changes', async () => {
    global.URL.createObjectURL = vi.fn(() => 'test-url');
    renderWithLanguage(<PiCollageTool />);

    // Upload image to reveal canvas
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([''], 't.png')] } });

    await waitFor(
      () => {
        expect(document.getElementById('picollage-export-area')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const exportArea = document.getElementById('picollage-export-area');

    // Change to Square (1:1)
    const squareBtn = screen.getByText('1:1');
    fireEvent.click(squareBtn);

    // Verify button state
    expect(squareBtn.closest('button')).toHaveClass('bg-tool-picollage/20');
  });

  it('targets 4K dimensions for export based on aspect ratio', async () => {
    global.URL.createObjectURL = vi.fn(() => 'test-url');
    renderWithLanguage(<PiCollageTool />);

    // Upload image to enable export button
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File([''], 't.png', { type: 'image/png' })] },
    });

    // Wait for the collage to be ready
    const exportBtn = await screen.findByRole(
      'button',
      { name: /Export Collage/i },
      { timeout: 3000 }
    );

    // Mock canvas to capture dimensions
    const mockCanvas = {
      getContext: vi.fn(() => ({
        fillStyle: '',
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        drawImage: vi.fn(),
      })),
      toDataURL: vi.fn(() => 'data:image/png;base64,'),
      width: 0,
      height: 0,
    };

    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return mockCanvas as any;
      if (tagName === 'a') return { click: vi.fn(), download: '', href: '' } as any;
      return originalCreateElement(tagName);
    });

    // 1. Verify 16:9 Export (Default)
    fireEvent.click(exportBtn);
    await waitFor(
      () => {
        expect(mockCanvas.width).toBe(3840);
        expect(mockCanvas.height).toBe(2160);
      },
      { timeout: 2000 }
    );

    // 2. Change to 9:16 and verify
    const portraitBtn = screen.getByText('9:16');
    fireEvent.click(portraitBtn);

    // Reset canvas dimensions to verify new write
    mockCanvas.width = 0;
    mockCanvas.height = 0;

    // Trigger Export again
    fireEvent.click(exportBtn);

    await waitFor(
      () => {
        expect(mockCanvas.width).toBe(2160);
        expect(mockCanvas.height).toBe(3840);
      },
      { timeout: 2000 }
    );

    // 3. Change to Square (1:1) and verify
    const squareBtn = screen.getByText('1:1');
    fireEvent.click(squareBtn);

    mockCanvas.width = 0;
    mockCanvas.height = 0;
    fireEvent.click(exportBtn);

    await waitFor(
      () => {
        expect(mockCanvas.width).toBe(2160);
        expect(mockCanvas.height).toBe(2160);
      },
      { timeout: 2000 }
    );

    createElementSpy.mockRestore();
  });

  it('correctly handles image movement with consistent canvas percentages', async () => {
    global.URL.createObjectURL = vi.fn(() => 'test-url');
    renderWithLanguage(<PiCollageTool />);

    // Upload image
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File([''], 't.png', { type: 'image/png' })] },
    });

    const piece = await screen.findByAltText('Collage Piece');
    const container = piece.closest('.transform-gpu') as HTMLElement;
    const exportArea = document.getElementById('picollage-export-area')!;
    const moveHandle = screen.getByTestId('image-move-handle');

    // Mock dimensions for predictable math
    vi.spyOn(exportArea, 'getBoundingClientRect').mockReturnValue({
      width: 1000,
      height: 1000, // square for simplicity in this test
      left: 0,
      top: 0,
    } as any);

    const canvasContainer = exportArea.parentElement!;

    // Mock Pointer Capture
    canvasContainer.setPointerCapture = vi.fn();
    canvasContainer.releasePointerCapture = vi.fn();

    // Initial position is x:20, y:20 (hardcoded in PiCollageTool.tsx for first image)
    expect(container).toHaveStyle({ left: '20%', top: '20%' });

    // Simulate move: drag from center of image (20% + 30%/2 = 35% -> 350px)
    fireEvent.pointerDown(moveHandle, { clientX: 350, clientY: 350, pointerId: 1 });

    // Move to 450, 450 (which is +10%)
    fireEvent.pointerMove(canvasContainer, { clientX: 450, clientY: 450, pointerId: 1 });
    fireEvent.pointerUp(canvasContainer, { pointerId: 1 });

    // New position: 20+10, 20+10 = 30, 30
    expect(container).toHaveStyle({ left: '30%', top: '30%' });
  });

  it('persists selection after movement/interaction', async () => {
    global.URL.createObjectURL = vi.fn(() => 'test-url');
    renderWithLanguage(<PiCollageTool />);

    // Upload image
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File([''], 't.png', { type: 'image/png' })] },
    });

    const piece = await screen.findByAltText('Collage Piece');
    const moveHandle = screen.getByTestId('image-move-handle');
    const exportArea = document.getElementById('picollage-export-area')!;
    const canvasContainer = exportArea.parentElement!;

    // Initial check: handles should be present
    const getHandles = () => document.querySelectorAll('[style*="cursor: nw-resize"]');
    expect(getHandles().length).toBe(1);

    // Mock Pointer Capture
    canvasContainer.setPointerCapture = vi.fn();
    canvasContainer.releasePointerCapture = vi.fn();

    // Simulate move
    fireEvent.pointerDown(moveHandle, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvasContainer, { clientX: 150, clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(canvasContainer, { pointerId: 1 });

    // Selection should PERSIST after interaction
    expect(getHandles().length).toBe(1);

    // Clicking the background (container) should clear it
    fireEvent.pointerDown(canvasContainer, { clientX: 0, clientY: 0, pointerId: 2 });
    expect(getHandles().length).toBe(0);
  });

  it('maintains isotropic rotation on 16:9 canvases (no skew)', async () => {
    global.URL.createObjectURL = vi.fn(() => 'test-url');
    renderWithLanguage(<PiCollageTool />);

    // Upload image
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File([''], 't.png', { type: 'image/png' })] },
    });

    const exportArea = await screen.findByTestId('picollage-export-area');
    const canvasContainer = exportArea.parentElement!;

    // Mock 16:9 dimensions (1600x900)
    vi.spyOn(exportArea, 'getBoundingClientRect').mockReturnValue({
      width: 1600,
      height: 900,
      left: 0,
      top: 0,
    } as any);

    // Mock Pointer Capture
    canvasContainer.setPointerCapture = vi.fn();
    canvasContainer.releasePointerCapture = vi.fn();

    const rotateHandle = screen.getByTestId('rotate-handle');
    const piece = screen.getByAltText('Collage Piece').closest('.transform-gpu') as HTMLElement;

    // Initial rotation
    expect(piece).toHaveStyle({ transform: 'rotate(0deg)' });

    // Center of image in pixels (initialX=20%, initialWidth=30%, width=1600 -> cx = 35% of 1600 = 560)
    // initialY=20%, initialHeight% = (30 / 1.777) * (1600/900) = 30%. cy = 35% of 900 = 315.
    
    // Start rotation drag from handle
    fireEvent.pointerDown(rotateHandle, { clientX: 560, clientY: 100, pointerId: 1 });

    // Move to (660, 415). dx=100, dy=100 from center(560, 315)
    // This is a 45 degree angle. atan2(100, 100) = 45.
    fireEvent.pointerMove(canvasContainer, { clientX: 660, clientY: 415, pointerId: 1 });

    // Result: 45 + 90 = 135 deg
    expect(piece).toHaveStyle({ transform: 'rotate(135deg)' });
  });

  it('keeps handles visible and interactable even when image exceeds canvas (no overflow-hidden)', async () => {
    global.URL.createObjectURL = vi.fn(() => 'test-url');
    renderWithLanguage(<PiCollageTool />);

    // Upload image
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File([''], 't.png', { type: 'image/png' })] },
    });

    const exportArea = await screen.findByTestId('picollage-export-area');

    // Verify overflow-hidden is NOT present
    expect(exportArea).not.toHaveClass('overflow-hidden');

    // Verify handles exist
    const getHandles = () => document.querySelectorAll('[style*="cursor: nw-resize"]');
    expect(getHandles().length).toBe(1);
  });
});
