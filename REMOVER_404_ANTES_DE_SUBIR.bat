@echo off
if exist app\404 (
  rmdir /s /q app\404
  echo Pasta app\404 removida.
) else (
  echo Pasta app\404 nao existe.
)

git add -A
git commit -m "remove 404 legado e adiciona not-found correto"
git push origin main
