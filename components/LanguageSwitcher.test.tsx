import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LanguageProvider } from '../contexts/LanguageContext';

describe('LanguageSwitcher', () => {
  it('renders English and Italian options', () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    );

    expect(screen.getByTitle('English')).toBeInTheDocument();
    expect(screen.getByTitle('Italiano')).toBeInTheDocument();
  });

  it('changes language when clicking a flag', () => {
    // We can't easily check the context state directly without a sibling component
    // but we can check if localStorage is updated as a side effect
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByTitle('Italiano'));
    expect(setItemSpy).toHaveBeenCalledWith('studio-one-language', 'it');

    fireEvent.click(screen.getByTitle('English'));
    expect(setItemSpy).toHaveBeenCalledWith('studio-one-language', 'en');

    setItemSpy.mockRestore();
  });

  it('applies correct opacity based on active language', () => {
    const { container } = render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    );

    const enFlag = screen.getByTitle('English');
    const itFlag = screen.getByTitle('Italiano');

    // Initial state (en)
    expect(enFlag.className).toContain('opacity-100');
    expect(itFlag.className).toContain('opacity-20');

    // Switch to it
    fireEvent.click(itFlag);
    expect(itFlag.className).toContain('opacity-100');
    expect(enFlag.className).toContain('opacity-20');
  });
});
