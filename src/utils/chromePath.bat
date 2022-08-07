set exe=
FOR /F "tokens=2* skip=2" %%a in ('reg query HKCR\ChromeHTML\shell\open\command /ve') do set exe=%%b
set exe=%exe:"=%
set exe=%exe:~0,-6%