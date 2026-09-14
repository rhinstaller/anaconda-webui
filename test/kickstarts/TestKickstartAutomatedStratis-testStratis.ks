lang en

bootloader --timeout=1
zerombr
clearpart --all --initlabel

# Regular partitions: EFI + /boot + / (ext4). A dedicated partition (stratis.01)
# is reserved as the block device for the Stratis pool.
part /boot/efi --fstype=efi --size=500  # EFI_PARTITION_KICKSTART_SIZE_MB
part /boot --fstype=ext4 --size=1024
part / --fstype=ext4 --size=5120
part stratis.01 --size=1 --grow

# Native Stratis kickstart commands (Anaconda/pykickstart >= F45):
#   stratispool <name> <blockdevs...>
#   stratisfs <mntpoint> --size=<MB> --name=<NAME> --poolname=<POOL>
# The stratis.01 partition grows to ~9 GB; the pool needs headroom for metadata
# overhead, so keep the requested filesystem size well below the pool size.
stratispool fedorapool stratis.01
stratisfs /home --size=2048 --name=home --poolname=fedorapool

# NOTE: / is intentionally kept on a regular ext4 partition. Placing / on
# Stratis installs but produces an UNBOOTABLE system (early boot hangs on
# dev-stratis-<pool>-root.device, as the pool is not activated in the
# initramfs). Stratis is therefore used only for /home.

rootpw testcase

timezone --utc Europe/Prague

%packages
%end
