Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WinUser32 {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);
}
"@

$SM_CXSCREEN = 0
$SM_CYSCREEN = 1

$MOUSEEVENTF_MOVE        = 0x0001
$MOUSEEVENTF_LEFTDOWN    = 0x0002
$MOUSEEVENTF_LEFTUP      = 0x0004
$MOUSEEVENTF_RIGHTDOWN   = 0x0008
$MOUSEEVENTF_RIGHTUP     = 0x0010
$MOUSEEVENTF_MIDDLEDOWN  = 0x0020
$MOUSEEVENTF_MIDDLEUP    = 0x0040
$MOUSEEVENTF_WHEEL       = 0x0800

$KEYEVENTF_KEYUP         = 0x0002
$KEYEVENTF_UNICODE       = 0x0004

$screenWidth  = [WinUser32]::GetSystemMetrics($SM_CXSCREEN)
$screenHeight = [WinUser32]::GetSystemMetrics($SM_CYSCREEN)

Write-Host "READY $screenWidth $screenHeight"
[Console]::Out.Flush()

while ($true) {
    $line = [Console]::ReadLine()
    if ($null -eq $line) { break }
    $line = $line.Trim()
    if ([string]::IsNullOrEmpty($line)) { continue }
    if ($line -eq "QUIT" -or $line -eq "EXIT") { break }

    try {
        $parts = $line -split " "
        $cmd = $parts[0].ToUpperInvariant()

        switch ($cmd) {
            "M" {
                # M x y (Set Cursor Position)
                $x = [int]$parts[1]
                $y = [int]$parts[2]
                [WinUser32]::SetCursorPos($x, $y) | Out-Null
            }
            "LC" {
                # Left Click
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
            }
            "LD" {
                # Left Button Down
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
            }
            "LU" {
                # Left Button Up
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
            }
            "RC" {
                # Right Click
                [WinUser32]::mouse_event($MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::mouse_event($MOUSEEVENTF_RIGHTUP, 0, 0, 0, [UIntPtr]::Zero)
            }
            "RD" {
                # Right Button Down
                [WinUser32]::mouse_event($MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, [UIntPtr]::Zero)
            }
            "RU" {
                # Right Button Up
                [WinUser32]::mouse_event($MOUSEEVENTF_RIGHTUP, 0, 0, 0, [UIntPtr]::Zero)
            }
            "DC" {
                # Double Click
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::mouse_event($MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
            }
            "W" {
                # Mouse Wheel Scroll (e.g. W -120 or W 120)
                $delta = [int]$parts[1]
                [WinUser32]::mouse_event($MOUSEEVENTF_WHEEL, 0, 0, [uint32]$delta, [UIntPtr]::Zero)
            }
            "C" {
                # Type Character (e.g. C a or C H)
                $charStr = $line.Substring(2)
                foreach ($c in $charStr.ToCharArray()) {
                    [WinUser32]::keybd_event(0, [byte]$c, $KEYEVENTF_UNICODE, [UIntPtr]::Zero)
                    [WinUser32]::keybd_event(0, [byte]$c, ($KEYEVENTF_UNICODE -bor $KEYEVENTF_KEYUP), [UIntPtr]::Zero)
                }
            }
            "K" {
                # Key Down or Up by Virtual Key code: K <vk> <isUp>
                $vk = [byte]$parts[1]
                $isUp = ($parts[2] -eq "1" -or $parts[2].ToUpper() -eq "UP")
                $flags = if ($isUp) { $KEYEVENTF_KEYUP } else { 0 }
                [WinUser32]::keybd_event($vk, 0, $flags, [UIntPtr]::Zero)
            }
            "WIN" {
                # Press Windows Key
                [WinUser32]::keybd_event(0x5B, 0, 0, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x5B, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
            }
            "TASKMGR" {
                # Ctrl+Shift+Esc
                [WinUser32]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero) # Ctrl down
                [WinUser32]::keybd_event(0x10, 0, 0, [UIntPtr]::Zero) # Shift down
                [WinUser32]::keybd_event(0x1B, 0, 0, [UIntPtr]::Zero) # Esc down
                [WinUser32]::keybd_event(0x1B, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x10, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x11, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
            }
            "ALTTAB" {
                # Alt+Tab
                [WinUser32]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero) # Alt down
                [WinUser32]::keybd_event(0x09, 0, 0, [UIntPtr]::Zero) # Tab down
                [WinUser32]::keybd_event(0x09, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x12, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
            }
            "EXPLORER" {
                # Win+E
                [WinUser32]::keybd_event(0x5B, 0, 0, [UIntPtr]::Zero) # Win down
                [WinUser32]::keybd_event(0x45, 0, 0, [UIntPtr]::Zero) # E down
                [WinUser32]::keybd_event(0x45, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                [WinUser32]::keybd_event(0x5B, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
            }
            "METRICS" {
                $w = [WinUser32]::GetSystemMetrics($SM_CXSCREEN)
                $h = [WinUser32]::GetSystemMetrics($SM_CYSCREEN)
                Write-Host "METRICS $w $h"
                [Console]::Out.Flush()
            }
        }
    } catch {
        # Silent ignore to keep worker running
    }
}
