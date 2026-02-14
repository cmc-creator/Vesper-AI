"""
OpenTelemetry Tracing Setup for Vesper AI
Enables distributed tracing for all operations: chat, memory, research, etc.
Traces are sent to http://localhost:4318 (AI Toolkit) or external OTLP collector
"""

import os
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor


def setup_tracing(service_name: str = "vesper-backend"):
    """
    Initialize OpenTelemetry tracing with OTLP exporter
    
    Args:
        service_name: Name of the service for traces
    """
    try:
        # Get OTLP endpoint from env or default to AI Toolkit
        otlp_endpoint = os.getenv("OTEL_OTLP_ENDPOINT", "http://localhost:4318/v1/traces")
        
        # Create resource
        resource = Resource(attributes={
            "service.name": service_name,
            "environment": "production" if os.getenv("RAILWAY_ENVIRONMENT_NAME") else "development"
        })
        
        # Create tracer provider
        provider = TracerProvider(resource=resource)
        
        # Create OTLP exporter
        otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        processor = BatchSpanProcessor(otlp_exporter)
        provider.add_span_processor(processor)
        
        # Set global tracer provider
        trace.set_tracer_provider(provider)
        
        print(f"✅ Tracing initialized: {service_name}")
        print(f"   OTLP Endpoint: {otlp_endpoint}")
        
        return provider
    except Exception as e:
        print(f"⚠️  Tracing setup failed: {e}")
        return None


def instrument_fastapi(app):
    """
    Instrument FastAPI application for automatic span creation
    
    Args:
        app: FastAPI application instance
    """
    try:
        # Instrument FastAPI
        FastAPIInstrumentor.instrument_app(app)
        
        # Instrument requests library (used for web scraping, API calls)
        RequestsInstrumentor().instrument()
        
        print("✅ FastAPI and requests instrumented")
    except Exception as e:
        print(f"⚠️  FastAPI instrumentation failed: {e}")


def get_tracer(name: str):
    """
    Get a tracer instance for manual span creation
    
    Args:
        name: Name of the tracer (usually __name__)
    
    Returns:
        Tracer instance
    """
    return trace.get_tracer(name)
