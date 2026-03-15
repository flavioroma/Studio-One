import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { TimeRangeSelector } from './TimeRangeSelector';

describe('TimeRangeSelector Component', () => {
  const mockFormatTime = (time: number) => `Formatted: ${time}`;
  const mockLabels = {
    setStart: 'Set Start',
    setEnd: 'Set End',
    selectionStart: 'Selection Start',
    selectionEnd: 'Selection End',
  };

  it('renders correctly with given props', () => {
    render(
      <TimeRangeSelector
        theme="audiotrim"
        currentTime={5}
        startTime={0}
        endTime={10}
        maxDuration={100}
        onStartTimeChange={() => {}}
        onEndTimeChange={() => {}}
        formatTime={mockFormatTime}
        labels={mockLabels}
      />
    );

    expect(screen.getByText('Set Start')).toBeInTheDocument();
    expect(screen.getByText('Set End')).toBeInTheDocument();
    expect(screen.getByText('Formatted: 5')).toBeInTheDocument();
  });

  it('triggers onStartTimeChange when set start button clicked', () => {
    const onStartChange = vi.fn();
    render(
      <TimeRangeSelector
        theme="audiotrim"
        currentTime={5}
        startTime={0}
        endTime={10}
        maxDuration={100}
        onStartTimeChange={onStartChange}
        onEndTimeChange={() => {}}
        formatTime={mockFormatTime}
        labels={mockLabels}
      />
    );

    fireEvent.click(screen.getByText('Set Start'));
    expect(onStartChange).toHaveBeenCalledWith(5);
  });

  it('triggers onEndTimeChange when set end button clicked', () => {
    const onEndChange = vi.fn();
    render(
      <TimeRangeSelector
        theme="audiotrim"
        currentTime={7}
        startTime={0}
        endTime={10}
        maxDuration={100}
        onStartTimeChange={() => {}}
        onEndTimeChange={onEndChange}
        formatTime={mockFormatTime}
        labels={mockLabels}
      />
    );

    fireEvent.click(screen.getByText('Set End'));
    expect(onEndChange).toHaveBeenCalledWith(7);
  });

  it('renders addons', () => {
    render(
      <TimeRangeSelector
        theme="audiotrim"
        currentTime={0}
        startTime={0}
        endTime={10}
        maxDuration={100}
        onStartTimeChange={() => {}}
        onEndTimeChange={() => {}}
        formatTime={mockFormatTime}
        labels={mockLabels}
        startAddon={<div data-testid="start-addon">Start Addon</div>}
        endAddon={<div data-testid="end-addon">End Addon</div>}
      />
    );

    expect(screen.getByTestId('start-addon')).toBeInTheDocument();
    expect(screen.getByTestId('end-addon')).toBeInTheDocument();
  });
});
