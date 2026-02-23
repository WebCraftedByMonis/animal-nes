"use client";

import Image from "next/image";
import Link from "next/link";
import { Cat, MenuIcon, Heart, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLoginModal } from "@/contexts/LoginModalContext";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { NavigationMenuDemo } from "./Navigation-menu";
import { ModeToggle } from "./ModeToggle";
import CountrySwitcher from "./CountrySwitcher";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { counts } = useCart();
  const { wishlist } = useWishlist();
  const { openModal } = useLoginModal();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 10;
      setIsScrolled(scrolled);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const hiddenRoutes = ["/login"];
  const shouldHideNavbar =
    pathname.startsWith("/dashboard") || hiddenRoutes.includes(pathname);

  if (shouldHideNavbar) return null;

  return (
    <nav
      className={cn(
        "text-foreground w-full border-b transition-all duration-300 fixed top-0 left-0 right-0 z-50",
        isScrolled
          ? "bg-background/75 backdrop-blur-xl border-border/40 shadow-lg supports-[backdrop-filter]:bg-background/60 dark:bg-background/75"
          : "bg-background border-border shadow-sm"
      )}
    >
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left Section - Logo and Navigation */}
          <div className="flex items-center gap-2 lg:gap-6">
            {/* Circular Logo - No brand name */}
            <Link href="/" className="shrink-0">
              <div className="relative h-12 w-auto sm:h-14 md:h-16">
                <Image
                  src="/logo.jpg"
                  alt="Animal Wellness Shop Logo"
                  width={200}  // Adjust based on your logo's actual dimensions
                  height={60}   // Adjust based on your logo's actual dimensions
                  className="object-contain h-full w-auto"
                  priority
                  sizes="200px"
                  quality={85}
                />
              </div>
            </Link>

            {/* Desktop Navigation - Only on large screens (lg:1024px+) */}
            <div className="hidden lg:flex items-center gap-0.5">
              <NavigationMenu>
                <NavigationMenuList className="gap-0.5">
                  {[
                    ["Products", "/products"],
                    ["Master Trainings", "/forms"],
                    ["Find Doctor", "/findDoctor"],
                  ].map(([label, href]) => (
                    <NavigationMenuItem key={label}>
                      <NavigationMenuLink
                        asChild
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "text-xs font-medium hover:text-green-500 transition-colors px-2 py-1.5"
                        )}
                      >
                        <Link href={href}>{label}</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}
                  {/* Wellness-News Dropdown */}
                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(
                        navigationMenuTriggerStyle(),
                        "text-xs font-medium hover:text-green-500 transition-colors px-2 py-1.5 flex items-center gap-1"
                      )}>
                        Wellness-News
                        <ChevronDown className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem asChild>
                          <Link href="/addNews" className="w-full cursor-pointer">
                            Add News
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/animal-news" className="w-full cursor-pointer">
                            Explore News
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>
                  {/* Dashboard Dropdown */}
                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(
                        navigationMenuTriggerStyle(),
                        "text-xs font-medium hover:text-green-500 transition-colors px-2 py-1.5 flex items-center gap-1"
                      )}>
                        Dashboard
                        <ChevronDown className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem asChild>
                          <Link href="/partner/dashboard" className="w-full cursor-pointer">
                            Partner Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/company/dashboard" className="w-full cursor-pointer">
                            Company Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            {/* Navigation Menu Demo - Visible on tablet (md:768px+) and desktop */}
            <div className="hidden md:block">
              <NavigationMenuDemo />
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 lg:gap-2">
            {/* Country Switcher */}
            <CountrySwitcher />

            {/* Theme Toggle - Hidden on mobile */}
            <div className="hidden sm:block">
              <ModeToggle />
            </div>

            {/* Wishlist Button with Badge */}
            <Link href="/wishlist" className="relative p-1.5" aria-label={`Wishlist${wishlist.length > 0 ? ` (${wishlist.length} items)` : ''}`}>
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 hover:text-green-600 transition-colors" />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-green-500 text-white text-[10px] sm:text-xs font-medium rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" aria-hidden="true">
                  {wishlist.length > 99 ? '99+' : wishlist.length}
                </span>
              )}
              <span className="sr-only">View wishlist</span>
            </Link>

            {/* Cart Button with Badge */}
            <Link href="/cart" className="relative p-1.5" aria-label={`Shopping cart${counts.productCount > 0 ? ` (${counts.productCount} items)` : ''}`}>
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 hover:text-green-600 transition-colors" />
              {counts.productCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-green-500 text-white text-[10px] sm:text-xs font-medium rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" aria-hidden="true">
                  {counts.productCount > 99 ? '99+' : counts.productCount}
                </span>
              )}
              <span className="sr-only">View shopping cart</span>
            </Link>

            {/* Animal Cart with Badge */}
            <Link href="/animalCart" className="relative p-1.5" aria-label={`Animal cart${counts.animalCount > 0 ? ` (${counts.animalCount} animals)` : ''}`}>
              <Cat className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 hover:text-green-600 transition-colors" />
              {counts.animalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-green-500 text-white text-[10px] sm:text-xs font-medium rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center" aria-hidden="true">
                  {counts.animalCount > 99 ? '99+' : counts.animalCount}
                </span>
              )}
              <span className="sr-only">View animal cart</span>
            </Link>

            {/* User Menu / Sign In */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-transparent hover:border-green-500/40 transition-colors">
                    <AvatarImage src={user.image || ""} />
                    <AvatarFallback className="text-xs sm:text-sm bg-green-500/10">
                      {user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-sm font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="w-full cursor-pointer">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="w-full cursor-pointer">
                      Order History
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-red-600 cursor-pointer"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-3 sm:px-4 h-8 sm:h-9 font-semibold"
                onClick={() => openModal('button')}
              >
                <span className="hidden sm:inline">Sign up</span>
                <span className="sm:hidden">Join</span>
              </Button>
            )}

            {/* Mobile Menu - Now only on mobile and tablet (md:768px and below) */}
            <div className="md:hidden">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    aria-label="Open navigation menu"
                  >
                    <MenuIcon className="h-5 w-5" />
                    <span className="sr-only">Open navigation menu</span>
                  </Button>
                </DrawerTrigger>

                <DrawerContent className="max-h-[85vh]">
                  <DrawerHeader className="border-b">
                    <DrawerTitle>Navigation Menu</DrawerTitle>
                  </DrawerHeader>

                  <div className="flex flex-col px-4 py-4 space-y-3 overflow-y-auto">
                    {/* NavigationMenuDemo for mobile — View, Join, Marketplace, Careers */}
                    <div>
                      <NavigationMenuDemo />
                    </div>

                    {/* Mobile Navigation Links */}
                    <div className="space-y-1 border-t pt-3">
                      {[
                        ["Products", "/products"],
                        ["Master Trainings", "/forms"],
                        ["Find Doctor", "/findDoctor"],
                      ].map(([label, href]) => (
                        <DrawerClose asChild key={label}>
                          <Link
                            href={href}
                            className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md hover:bg-green-500/10 hover:text-green-600 transition-colors"
                          >
                            {label}
                          </Link>
                        </DrawerClose>
                      ))}

                      {/* Wellness-News Dropdown (mobile) */}
                      <div className="pt-2">
                        <p className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Wellness-News</p>
                        <DrawerClose asChild>
                          <Link
                            href="/addNews"
                            className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md hover:bg-green-500/10 hover:text-green-600 transition-colors"
                          >
                            Add News
                          </Link>
                        </DrawerClose>
                        <DrawerClose asChild>
                          <Link
                            href="/animal-news"
                            className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md hover:bg-green-500/10 hover:text-green-600 transition-colors"
                          >
                            Explore News
                          </Link>
                        </DrawerClose>
                      </div>

                      {/* Dashboard Section */}
                      <div className="pt-2">
                        <p className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Dashboards</p>
                        <DrawerClose asChild>
                          <Link
                            href="/partner/dashboard"
                            className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md hover:bg-green-500/10 hover:text-green-600 transition-colors"
                          >
                            Partner Dashboard
                          </Link>
                        </DrawerClose>
                        <DrawerClose asChild>
                          <Link
                            href="/company/dashboard"
                            className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md hover:bg-green-500/10 hover:text-green-600 transition-colors"
                          >
                            Company Dashboard
                          </Link>
                        </DrawerClose>
                      </div>
                    </div>

                    {/* Theme Toggle in mobile menu */}
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm font-medium">Theme</span>
                        <ModeToggle />
                      </div>
                    </div>

                    {/* User info in mobile menu */}
                    {user && (
                      <div className="pt-3 border-t">
                        <div className="px-3 py-2">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <DrawerFooter className="border-t">
                    <DrawerClose asChild>
                      <Button variant="outline" className="w-full">
                        Close Menu
                      </Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
