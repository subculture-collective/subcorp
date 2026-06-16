use std::fs;
use std::path::Path;

pub fn collect_artifact_urls() -> Vec<String> {
    let mut urls = Vec::new();
    let audit_dir = "output/artifacts";
    
    if Path::new(&audit_dir).exists() {
        for entry in fs::read_dir(audit_dir).expect("Failed to read audit directory") {
            let path = entry.expect("Failed to read entry").path();
            let url = format!("https://git.subcult.tv/subculture-collective/{}", path.file_name().unwrap().to_str().unwrap());
            urls.push(url);
        }
    }
    urls
}

pub fn verify_artifact_owner(path: &str) -> Option<String> {
    let metadata = fs::metadata(path).ok()?;
    Some(metadata.owner().unwrap().to_string())
}

pub fn record_verification_date(path: &str) -> std::io::Result<String> {
    let now = chrono::Utc::now();
    fs::write(path, now.to_rfc3339())
}