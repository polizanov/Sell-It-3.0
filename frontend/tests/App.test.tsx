import { render, screen } from '@testing-library/react';

import App from '../src/App';

describe('App', () => {
  it('renders SellIt', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /sellit/i })).toBeInTheDocument();
  });
});

