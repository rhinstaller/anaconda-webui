bootloader --timeout=1
zerombr
clearpart --all
part /boot/efi --fstype=efi --size=500  # EFI_PARTITION_KICKSTART_SIZE_MB
part /boot --fstype=xfs --size=1100
part swap --size=1024
part / --fstype=xfs --grow
part /home --fstype=xfs --size=2048

%packages
@^workstation-product-environment
@domain-client
%end
