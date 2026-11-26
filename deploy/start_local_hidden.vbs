Option Explicit
Dim fso, shell, baseDir
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = baseDir
shell.Run "python """ & baseDir & "\local_server.py""", 0, False
