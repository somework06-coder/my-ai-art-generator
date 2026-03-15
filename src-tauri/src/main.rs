#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn export_video(
    app: tauri::AppHandle,
    input_frames_dir: String,
    fps: u32,
    crf: u32,
    output_path: String,
    width: u32,
    height: u32,
) -> Result<String, String> {
    
    // We expect the frontend to tell us where it saved the frame images (e.g., frame_%05d.jpg)
    // and where it wants the output mp4 to go.

    let args = vec![
        "-y".to_string(), // Overwrite output
        "-framerate".to_string(),
        fps.to_string(),
        "-i".to_string(),
        format!("{}/frame_%05d.jpg", input_frames_dir),
        "-c:v".to_string(),
        "libx264".to_string(),
        "-vf".to_string(),                  // Force explicit dimensions metadata 
        format!("scale={}:{}", width, height), // into the video stream header
        "-pix_fmt".to_string(),
        "yuv420p".to_string(),
        "-crf".to_string(),
        crf.to_string(),
        "-preset".to_string(),
        "fast".to_string(),
        "-movflags".to_string(),
        "+faststart".to_string(),
        output_path.clone(),
    ];

    let sidecar_command = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args(args);

    let (mut rx, mut _child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

    // We block and wait for ffmpeg to finish by reading the events
    while let Some(event) = rx.recv().await {
        if let CommandEvent::Stderr(line) = event {
            // FFmpeg logs progress to stderr
            let log = String::from_utf8_lossy(&line);
            println!("{}", log);
        }
    }

    Ok(output_path)
}

#[tauri::command]
fn get_temp_dir() -> Result<String, String> {
    // Return standard OS temp directory
    std::env::temp_dir()
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Could not get temp dir".to_string())
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open file: {}", e))?;

    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(format!("/select,\"{}\"", path))
        .spawn()
        .map_err(|e| format!("Failed to open file: {}", e))?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open file: {}", e))?;

    Ok(())
}

pub fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            export_video,
            get_temp_dir,
            open_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
