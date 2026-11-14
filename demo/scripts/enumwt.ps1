# Prints the handle of every visible Windows Terminal top-level window (one per line). Read-only.
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public class WtEnum {
  public delegate bool P(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(P cb, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
}
"@
$rows = New-Object System.Collections.ArrayList
[WtEnum]::EnumWindows({ param($h, $l)
  $c = New-Object System.Text.StringBuilder 256
  [void][WtEnum]::GetClassName($h, $c, 256)
  if ($c.ToString() -eq 'CASCADIA_HOSTING_WINDOW_CLASS' -and [WtEnum]::IsWindowVisible($h)) { [void]$rows.Add([int64]$h) }
  return $true }, [IntPtr]::Zero) | Out-Null
$rows
