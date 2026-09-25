/*
  NOVASPACE
  Supabase configuration:
  1. Create a Supabase project.
  2. Create a Storage bucket named "uploads" and make it public for this simple version.
  3. Put your Project URL and anon/publishable key below.
*/
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL";
const SUPABASE_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY";

const hasSupabaseConfig =
  SUPABASE_URL.startsWith("http") &&
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_KEY.includes("PASTE_");

const sb = hasSupabaseConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function showPage(id){
  $$(".page").forEach(p => p.classList.toggle("active", p.id === id));
  $$("nav a").forEach(a => a.classList.toggle("active", a.dataset.page === id));
  if(id === "files") loadFiles();
  if(id === "photos") loadPhotos();
  history.replaceState(null,"","#"+id);
}
function currentPage(){
  const id = location.hash.replace("#","") || "home";
  return ["home","files","photos","submit"].includes(id) ? id : "home";
}
$$("[data-page]").forEach(a => a.addEventListener("click", e => {
  const id = a.dataset.page;
  if(id){ e.preventDefault(); showPage(id); $("#nav").classList.remove("open"); }
}));
$("#menuBtn").addEventListener("click",()=>$("#nav").classList.toggle("open"));
$("#enterBtn").addEventListener("click",()=>$("#welcome").classList.add("hide"));

function extIcon(name){
  const e=(name.split(".").pop()||"").toLowerCase();
  if(["jpg","jpeg","png","gif","webp","svg"].includes(e)) return "🖼️";
  if(["pdf"].includes(e)) return "📕";
  if(["doc","docx"].includes(e)) return "📝";
  if(["ppt","pptx"].includes(e)) return "📊";
  if(["xls","xlsx","csv"].includes(e)) return "📈";
  if(["zip","rar","7z"].includes(e)) return "🗜️";
  return "📄";
}
function fmt(bytes){
  if(bytes < 1024) return bytes+" B";
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1)+" KB";
  return (bytes/1024/1024).toFixed(1)+" MB";
}
function msg(el,text,type=""){
  el.textContent=text; el.className="message "+type;
}

async function uploadFiles(files, folder, messageEl){
  if(!files.length) return;
  if(!sb){
    msg(messageEl,"Storage belum terhubung. Isi SUPABASE_URL dan SUPABASE_KEY di script.js dulu.");
    return;
  }
  msg(messageEl,"Mengupload "+files.length+" file...");
  let ok=0;
  for(const file of files){
    if(file.size > 25*1024*1024){ continue; } // 25 MB limit for this starter
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
    const {error}=await sb.storage.from("uploads").upload(path,file,{upsert:false,contentType:file.type});
    if(!error) ok++;
  }
  msg(messageEl,`Selesai: ${ok} dari ${files.length} file berhasil diupload.`);
  loadFiles(); loadPhotos();
}

$("#fileInput").addEventListener("change",e=>uploadFiles([...e.target.files],"files",$("#fileMessage")));
$("#photoInput").addEventListener("change",e=>uploadFiles([...e.target.files],"photos",$("#photoMessage")));

async function loadFiles(){
  if(!sb){
    $("#fileList").innerHTML='<div class="empty">Hubungkan Supabase untuk menyimpan file secara online.</div>';
    $("#fileCount").textContent="—"; return;
  }
  const {data,error}=await sb.storage.from("uploads").list("files",{limit:100,sortBy:{column:"created_at",order:"desc"}});
  if(error){$("#fileList").innerHTML='<div class="empty">Gagal membaca file.</div>';return}
  const items=(data||[]).filter(x=>x.name && x.id);
  $("#fileCount").textContent=items.length;
  if(!items.length){$("#fileList").innerHTML='<div class="empty">Belum ada file. Upload file pertama kamu.</div>';return}
  $("#fileList").innerHTML=items.map(x=>{
    const {data:url}=sb.storage.from("uploads").getPublicUrl("files/"+x.name);
    return `<div class="file-card"><div class="file-icon">${extIcon(x.name)}</div><div class="file-info"><b title="${escapeHtml(x.name)}">${escapeHtml(x.name)}</b><small>${x.metadata?.size ? fmt(x.metadata.size) : "File tersimpan"}</small></div><a class="file-open" href="${url.publicUrl}" target="_blank" rel="noopener">Buka</a></div>`;
  }).join("");
}
async function loadPhotos(){
  if(!sb){$("#photoGrid").innerHTML='<div class="empty">Hubungkan Supabase untuk menyimpan foto secara online.</div>';$("#photoCount").textContent="—";return}
  const {data,error}=await sb.storage.from("uploads").list("photos",{limit:100,sortBy:{column:"created_at",order:"desc"}});
  if(error){$("#photoGrid").innerHTML='<div class="empty">Gagal membaca foto.</div>';return}
  const items=(data||[]).filter(x=>x.name && x.id);
  $("#photoCount").textContent=items.length;
  if(!items.length){$("#photoGrid").innerHTML='<div class="empty">Belum ada foto. Upload gambar pertama kamu.</div>';return}
  $("#photoGrid").innerHTML=items.map(x=>{
    const {data:url}=sb.storage.from("uploads").getPublicUrl("photos/"+x.name);
    return `<a class="photo-card" href="${url.publicUrl}" target="_blank" rel="noopener"><img loading="lazy" src="${url.publicUrl}" alt="${escapeHtml(x.name)}"><div>${escapeHtml(x.name)}</div></a>`;
  }).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

$("#taskForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const out=$("#submitMessage");
  if(!sb){msg(out,"Storage belum terhubung. Isi konfigurasi Supabase di script.js dulu.");return}
  const fd=new FormData(e.target), file=fd.get("taskFile");
  if(!file || !file.name){msg(out,"Pilih file tugas terlebih dahulu.");return}
  if(file.size > 25*1024*1024){msg(out,"Ukuran file maksimal 25 MB.");return}
  msg(out,"Mengirim tugas...");
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const path=`submissions/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
  const upload=await sb.storage.from("uploads").upload(path,file,{upsert:false,contentType:file.type});
  if(upload.error){msg(out,"Upload tugas gagal: "+upload.error.message);return}
  const {error:dbError}=await sb.from("submissions").insert({
    name:fd.get("name"), class_name:fd.get("className"), subject:fd.get("subject"),
    title:fd.get("title"), note:fd.get("note"), file_path:path, file_name:file.name
  });
  if(dbError){msg(out,"File berhasil diupload, tetapi data tugas gagal disimpan: "+dbError.message);return}
  e.target.reset();
  msg(out,"✅ Tugas berhasil dikirim.");
});

showPage(currentPage());
