import React from 'react';

export default function ServerOnlyComponent() {
  let tls;
  if (typeof window === 'undefined') {
    tls = require('tls');
  }

  return (
    <div>
      {tls ? 'TLS module loaded on the server' : 'This is a client-side render'}
    </div>
  );
}