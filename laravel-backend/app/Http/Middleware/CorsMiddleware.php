<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        \Log::info('CORS MIDDLEWARE HIT:', [
            'method' => $request->getMethod(),
            'uri' => $request->getUri()
        ]);

        // Handle preflight OPTIONS request
        if ($request->getMethod() === 'OPTIONS') {
            \Log::info('Handling OPTIONS request');
            $response = new Response('', 200);
            $response->headers->set('Access-Control-Allow-Origin', '*');
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
            // Note: Cannot use credentials with wildcard origin
            $response->headers->set('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

            \Log::info('CORS headers set for OPTIONS (wildcard), returning response');
            return $response;
        }

        // Handle actual request
        $response = $next($request);

        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
        // Note: Cannot use credentials with wildcard origin

        \Log::info('CORS headers set for request (wildcard), returning response');
        return $response;
    }
}
