import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// This import caused the crash. By creating the file in Step 1, this will now work.
import './index.css' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Simple Error Boundary to catch the "White Screen" cause
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#333' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#e11d48' }}>Something went wrong.</h1>
          <p>Please send this screenshot to support:</p>
          <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '8px', overflow: 'auto' }}>
            <p style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
            <pre style={{ fontSize: '11px', marginTop: '10px' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)