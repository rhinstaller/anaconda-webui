bootloader --timeout=1
clearpart --all --initlabel

part /boot/efi --fstype=efi --size=500 --ondisk=vda  # EFI_PARTITION_KICKSTART_SIZE_MB
part /boot/efi --fstype=efi --size=500 --ondisk=vdb  # EFI_PARTITION_KICKSTART_SIZE_MB
part /boot --fstype=xfs --size=1100 --ondisk=vda
part raid.11 --size=1024 --ondisk=vda
part raid.12 --size=1024 --ondisk=vdb
part raid.21 --ondisk=vda --size=1 --grow
part raid.22 --ondisk=vdb --size=1 --grow

raid swap  --level=1 --device=0 --fstype=swap raid.11 raid.12
raid /     --level=0 --device=1 --fstype=xfs raid.21 raid.22

rootpw testcase

timezone --utc Europe/Prague

%packages
%end
