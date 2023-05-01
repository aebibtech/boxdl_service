function urlChecker(url){
    return /https:\/\/(.*)\.box\.com\/(.*)/.test(url);
}

document.addEventListener("DOMContentLoaded", function(){
    document.querySelector("form").addEventListener("submit", async function(event){
        event.preventDefault();
        let fileName = "";
        if(document.querySelector("form textarea").value === ""){
            alert("Put a valid box.com link.");
            return;
        }
        let allLinksValid = false;
        const invalidLinks = [];
        const links = document.querySelector("form textarea").value.split(/\s/);

        links.forEach(function(link){
            allLinksValid = urlChecker(link);
            if(!urlChecker(link)){
                invalidLinks.push(link);
            }
        });

        if(allLinksValid){
            const links_str = JSON.stringify({ links: links });
            try{
                const response = await fetch("/download", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: links_str
                });
                const file = await response.blob();
                const header = response.headers.get("Content-Disposition");
                const parts = header.split(";");
                fileName = parts[1].split("=")[1].slice(1, parts[1].split("=")[1].length - 1);
                const f = window.URL.createObjectURL(file);
                const dLink = document.createElement("a");
                dLink.href = f;
                dLink.download = fileName;
                dLink.click();
            }catch(e){
                alert("Server error.");
            };
        }else{
            alert("Only put valid box.com links.");
        }
    });
});