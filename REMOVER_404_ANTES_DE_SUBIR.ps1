if (Test-Path "app/404") {
  Remove-Item -Recurse -Force "app/404"
  Write-Host "Pasta app/404 removida."
} else {
  Write-Host "Pasta app/404 nao existe."
}

git add -A
git commit -m "remove 404 legado e adiciona not-found correto"
git push origin main
