import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders book recommendation system title', () => {
  render(<App />);
  const titleElement = screen.getByText(/読書の旅をはじめましょう/i);
  expect(titleElement).toBeInTheDocument();
});
