<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Basic web routes for Laravel compatibility
Route::get('/login', function () {
    return redirect('http://localhost:8080/multi-world-hub/auth/login');
})->name('login');
