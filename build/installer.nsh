!macro customHeader
  !system "echo 'Building StarWing installer...'"
!macroend

!macro customInstall
  ; 创建更新备份目录
  CreateDirectory "$INSTDIR\backup"
  
  ; 创建更新日志目录
  CreateDirectory "$APPDATA\starwing\update-logs"
  
  ; 写入安装信息
  WriteINIStr "$APPDATA\starwing\install.ini" "Install" "Path" "$INSTDIR"
  WriteINIStr "$APPDATA\starwing\install.ini" "Install" "Version" "1.0.0"
  WriteINIStr "$APPDATA\starwing\install.ini" "Install" "Date" "${__DATE__}"
!macroend

!macro customUnInstall
  ; 清理更新日志（可选）
  ; RMDir /r "$APPDATA\starwing\update-logs"
  
  ; 保留用户数据
  ; RMDir /r "$APPDATA\starwing"
!macroend

!macro customRemoveFiles
  ; 移除备份目录
  RMDir /r "$INSTDIR\backup"
!macroend
