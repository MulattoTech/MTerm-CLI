# SPDX-License-Identifier: MIT
# MTerm-CLI Native Windows Win32 Job Object Supervisor
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$TypeDef = @"
using System;
using System.Runtime.InteropServices;

public class Win32Job {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool TerminateJobObject(IntPtr hJob, uint uExitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetInformationJobObject(IntPtr hJob, int JobObjectInfoClass, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

    public const uint PROCESS_TERMINATE = 0x0001;
    public const uint PROCESS_SET_QUOTA = 0x0100;
    public const int JobObjectExtendedLimitInformation = 9;
    public const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;

    [StructLayout(LayoutKind.Sequential)]
    public struct IO_COUNTERS {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryLimit;
        public UIntPtr PeakJobMemoryLimit;
    }

    public static bool EnableKillOnClose(IntPtr hJob) {
        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr ptr = Marshal.AllocHGlobal(length);
        try {
            Marshal.StructureToPtr(info, ptr, false);
            return SetInformationJobObject(hJob, JobObjectExtendedLimitInformation, ptr, (uint)length);
        } finally {
            Marshal.FreeHGlobal(ptr);
        }
    }
}
"@

Add-Type -TypeDefinition $TypeDef

$Jobs = @{}

[Console]::Out.WriteLine("READY")
[Console]::Out.Flush()

while ($line = [Console]::In.ReadLine()) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line.Trim().Split(" ")
    $cmd = $parts[0].ToUpperInvariant()

    try {
        switch ($cmd) {
            "CREATE" {
                $id = $parts[1]
                $hJob = [Win32Job]::CreateJobObject([IntPtr]::Zero, $null)
                if ($hJob -eq [IntPtr]::Zero) {
                    [Console]::Out.WriteLine("ERR CREATE $($id) $([Marshal]::GetLastWin32Error())")
                } else {
                    if ([Win32Job]::EnableKillOnClose($hJob)) {
                        $Jobs[$id] = $hJob
                        [Console]::Out.WriteLine("OK CREATE $($id)")
                    } else {
                        $err = [Marshal]::GetLastWin32Error()
                        [Win32Job]::CloseHandle($hJob) | Out-Null
                        [Console]::Out.WriteLine("ERR CREATE_LIMIT $($id) $($err)")
                    }
                }
            }
            "ASSIGN" {
                $id = $parts[1]
                $pidToAssign = [int]$parts[2]
                if (-not $Jobs.ContainsKey($id)) {
                    # Create job on the fly if needed
                    $hJob = [Win32Job]::CreateJobObject([IntPtr]::Zero, $null)
                    if ($hJob -eq [IntPtr]::Zero) {
                        [Console]::Out.WriteLine("ERR CREATE $($id) $([Marshal]::GetLastWin32Error())")
                        continue
                    }
                    if (-not [Win32Job]::EnableKillOnClose($hJob)) {
                        $err = [Marshal]::GetLastWin32Error()
                        [Win32Job]::CloseHandle($hJob) | Out-Null
                        [Console]::Out.WriteLine("ERR CREATE_LIMIT $($id) $($err)")
                        continue
                    }
                    $Jobs[$id] = $hJob
                } else {
                    $hJob = $Jobs[$id]
                }

                $hProc = [Win32Job]::OpenProcess([Win32Job]::PROCESS_SET_QUOTA -bor [Win32Job]::PROCESS_TERMINATE, $false, $pidToAssign)
                if ($hProc -eq [IntPtr]::Zero) {
                    [Console]::Out.WriteLine("ERR OPEN_PROCESS $($id) $($pidToAssign) $([Marshal]::GetLastWin32Error())")
                } else {
                    $assigned = [Win32Job]::AssignProcessToJobObject($hJob, $hProc)
                    [Win32Job]::CloseHandle($hProc) | Out-Null
                    if ($assigned) {
                        [Console]::Out.WriteLine("OK ASSIGN $($id) $($pidToAssign)")
                    } else {
                        [Console]::Out.WriteLine("ERR ASSIGN $($id) $($pidToAssign) $([Marshal]::GetLastWin32Error())")
                    }
                }
            }
            "TERMINATE" {
                $id = $parts[1]
                if ($Jobs.ContainsKey($id)) {
                    $hJob = $Jobs[$id]
                    $terminated = [Win32Job]::TerminateJobObject($hJob, 0)
                    [Win32Job]::CloseHandle($hJob) | Out-Null
                    $Jobs.Remove($id) | Out-Null
                    if ($terminated) {
                        [Console]::Out.WriteLine("OK TERMINATE $($id)")
                    } else {
                        [Console]::Out.WriteLine("ERR TERMINATE $($id)")
                    }
                } else {
                    [Console]::Out.WriteLine("OK TERMINATE_ALREADY_CLOSED $($id)")
                }
            }
            "EXIT" {
                foreach ($hJob in $Jobs.Values) {
                    [Win32Job]::TerminateJobObject($hJob, 0) | Out-Null
                    [Win32Job]::CloseHandle($hJob) | Out-Null
                }
                $Jobs.Clear()
                [Console]::Out.WriteLine("OK EXIT")
                exit 0
            }
            default {
                [Console]::Out.WriteLine("ERR UNKNOWN_COMMAND $($cmd)")
            }
        }
    } catch {
        [Console]::Out.WriteLine("ERR EXCEPTION $($_.Exception.Message)")
    }
    [Console]::Out.Flush()
}
