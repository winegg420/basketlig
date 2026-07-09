// Charazay 2.0 masaüstü sarmalayıcı (Tauri v2).
// Oyun tamamen dist-desktop/ içindeki statik HTML+JS'tir; Rust tarafı yalnız pencereyi açar.
// Kayıtlar WebView2'nin kalıcı profili üzerinden localStorage/IndexedDB'de tutulur
// (profil dizini: %APPDATA%/com.winegg.charazay — silinmedikçe kayıtlar korunur).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Charazay penceresi başlatılamadı");
}
