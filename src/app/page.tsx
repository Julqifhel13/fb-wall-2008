"use client";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { supabase } from "@/utils/supabaseClient";
import { useDropzone } from 'react-dropzone';

const DEFAULT_USER = {
	id: "00000000-0000-0000-0000-000000000001", // Replace with your actual user UUID if needed
	name: "Julqifhel",
};

const PROFILE_IMG_KEY = 'profileImg';

export default function Home() {
	const [profileImg, setProfileImg] = useState<string>("/profile.jpg");
	const [posts, setPosts] = useState<Array<{
		id?: string;
		user_id?: string;
		user?: { name: string };
		body?: string;
		created_at?: string;
		images?: string[];
	}>>([]);
	const [inputValue, setInputValue] = useState("");
	const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [loading, setLoading] = useState(false);
	const [attachedImages, setAttachedImages] = useState<string[]>([]);

	// Fetch posts from Supabase on mount and on changes
	const fetchPosts = async () => {
		const { data, error } = await supabase
			.from("posts")
			.select("id, user_id, body, created_at, images") // <-- include images
			.order("created_at", { ascending: false });
		if (!error && data) {
			// Attach user name manually for display
			setPosts(data.map(post => ({
				...post,
				user: { name: DEFAULT_USER.name },
			})));
		}
	};

	useEffect(() => {
		fetchPosts();
		// Subscribe to realtime changes
		const channel = supabase
			.channel('public:posts')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, []);

	useEffect(() => {
		// On mount, load profile image from localStorage if available
		const storedImg = typeof window !== 'undefined' ? localStorage.getItem(PROFILE_IMG_KEY) : null;
		if (storedImg) setProfileImg(storedImg);
	}, []);

	const handleProfileImgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = async (ev) => {
				if (typeof ev.target?.result === "string") {
					setProfileImg(ev.target.result);
					try {
						if (typeof window !== 'undefined') {
							localStorage.setItem(PROFILE_IMG_KEY, ev.target.result);
						}
					} catch {
						// If quota exceeded, show a warning and do not persist
						alert("Profile image is too large to save locally. Please use a smaller image.");
					}
				}
			};
			reader.readAsDataURL(file);
		}
	};

	// Dropzone for drag-and-drop
	const onDrop = (acceptedFiles: File[]) => {
		const readers: Promise<string>[] = [];
		for (let i = 0; i < acceptedFiles.length; i++) {
			const file = acceptedFiles[i];
			readers.push(new Promise((resolve) => {
				const reader = new FileReader();
				reader.onload = (ev) => {
					if (typeof ev.target?.result === "string") {
						resolve(ev.target.result);
					}
				};
				reader.readAsDataURL(file);
			}));
		}
		Promise.all(readers).then((images) => {
			setAttachedImages((prev) => [...prev, ...images]);
		});
	};
	const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: true });

	const handleShare = async () => {
		if (inputValue.trim() || attachedImages.length > 0) {
			setLoading(true);
			const { data, error } = await supabase
				.from("posts")
				.insert([
					{
						user_id: DEFAULT_USER.id,
						body: inputValue,
						images: attachedImages.length > 0 ? attachedImages : null,
					},
				])
				.select("id, user_id, body, created_at, images").single();
			if (!error && data) {
				// Optimistically add the new post to the top for instant feedback
				setPosts(prev => [{ ...data, user: { name: DEFAULT_USER.name } }, ...prev]);
				setInputValue("");
				setAttachedImages([]);
			}
			setLoading(false);
		}
	};

	const handleDeletePost = async (idx: number) => {
		const post = posts[idx];
		if (post && post.id) {
			await supabase.from("posts").delete().eq("id", post.id);
			// Optimistically remove the post from UI for instant feedback
			setPosts(prev => prev.filter((_, i) => i !== idx));
		}
	};

	return (
		<div className="min-h-screen bg-[#e9ebee] font-sans">
			{/* Top Nav */}
			<nav className="w-full bg-[#3b5998] text-white flex flex-col sm:flex-row items-center sm:items-center px-2 sm:px-8 py-2 text-sm shadow-md">
				<span className="font-bold text-2xl tracking-tight mr-0 sm:mr-8 mb-2 sm:mb-0">
					Wall
				</span>
				<div className="flex gap-4 sm:gap-6 flex-1 flex-wrap justify-center sm:justify-start">
					<a className="hover:underline" href="#">
						Home
					</a>
					<a className="hover:underline" href="#">
						Profile
					</a>
					<a className="hover:underline" href="#">
						Friends
					</a>
					<a className="hover:underline" href="#">
						Inbox{" "}
						<span className="bg-blue-200 text-blue-900 rounded px-1 ml-1">2</span>
					</a>
				</div>
				<div className="flex gap-2 sm:gap-4 items-center mt-2 sm:mt-0">
					<span className="font-semibold">Julqifhel</span>
					<a className="hover:underline" href="#">
						Settings
					</a>
					<a className="hover:underline" href="#">
						Logout
					</a>
					<input
						className="ml-0 sm:ml-4 px-2 py-1 rounded text-black text-xs"
						placeholder="Search"
					/>
				</div>
			</nav>
			{/* Main Content */}
			<div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-4 sm:gap-6 mt-4 sm:mt-6 px-1 sm:px-2">
				{/* Left Sidebar */}
				<aside className="w-full lg:w-64 flex-shrink-0 mb-4 lg:mb-0">
					<div className="bg-white shadow p-2 mb-4">
						<div className="w-full aspect-square overflow-hidden mb-2 relative group max-w-xs mx-auto">
							<Image
								src={profileImg}
								alt="Julqifhel"
								width={256}
								height={256}
								className="object-cover w-full h-full"
							/>
							<button
								className="absolute bottom-2 right-2 bg-white/80 text-xs px-2 py-1 shadow hover:bg-blue-100 border border-gray-300 group-hover:opacity-100 opacity-0 transition"
								onClick={() => fileInputRef.current?.click()}
								type="button"
							>
								Change Photo
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleProfileImgChange}
							/>
						</div>
						<ul className="text-xs text-blue-700 space-y-1 mb-2">
							<li>
								<a href="#" className="hover:underline">
									View Photos of Julqifhel (541)
								</a>
							</li>
							<li>
								<a href="#" className="hover:underline">
									View Videos of Julqifhel (14)
								</a>
							</li>
							<li>
								<a href="#" className="hover:underline">
									Send Julqifhel a Message
								</a>
							</li>
							<li>
								<a href="#" className="hover:underline">
									Poke Julqifhel
								</a>
							</li>
							<li>
								<a href="#" className="hover:underline">
									Subscribe via SMS
								</a>
							</li>
						</ul>
						<div className="bg-gray-50 border text-xs p-2 mb-4">
							<div className="font-semibold border-b pb-1 mb-1">Information</div>
							<div className="mb-1">
								<span className="font-semibold">Software Developer</span>
								<br />
								Facebook wall 2008, New Era University Alumni
							</div>
							<div className="mb-1">
								<span className="font-semibold">Birthday</span>
								<br />
								Feb 6, 2003
							</div>
							<div>
								<span className="font-semibold">Current City</span>
								<br />
								Palo Alto, CA
							</div>
						</div>
						<div className="bg-gray-50 border text-xs p-2">
							<div className="font-semibold border-b pb-1 mb-1">Mutual Friends</div>
							<div>
								287 friends in common{" "}
								<a href="#" className="text-blue-700 hover:underline">
									See All
								</a>
							</div>
						</div>
					</div>
				</aside>
				{/* Center Wall */}
				<main className="flex-1 min-w-0">
					<div className="bg-white shadow p-2 sm:p-4 mb-4">
						<div className="flex gap-4 items-center border-b pb-2 mb-2">
							<span className="font-bold text-lg">Julqifhel</span>
							<div className="flex gap-2 text-sm text-gray-600">
								<a
									href="#"
									className="font-semibold border-b-2 border-blue-700 text-blue-700"
								>
									Wall
								</a>
								<a className="hover:underline" href="#">
									Info
								</a>
								<a className="hover:underline" href="#">
									Photos
								</a>
								<a className="hover:underline" href="#">
									Notes
								</a>
								<a className="hover:underline" href="#">
									Boxes
								</a>
							</div>
						</div>
						{/* Wall Input */}
						<div className="mb-2 border border-gray-300 bg-white" style={{ borderRadius: 2, boxShadow: '0 1px 2px #ddd' }}>
							<div className="px-2 pt-2 pb-1">
								<Input
									className="w-full border-none focus:ring-0 focus:outline-none text-sm bg-transparent"
									style={{ boxShadow: 'none', borderRadius: 0, fontFamily: 'Tahoma, Geneva, Verdana, sans-serif' }}
									placeholder="Write something..."
									value={inputValue}
									onChange={(e) => setInputValue(e.target.value.slice(0, 280))}
									maxLength={280}
									disabled={loading}
								/>
							</div>
							<div className="flex items-center justify-between px-2 pb-2 pt-1 border-t border-gray-200 bg-[#f7f7f7]" style={{ fontFamily: 'Tahoma, Geneva, Verdana, sans-serif', fontSize: 13 }}>
								<div className="flex items-center gap-2">
									<span className="text-gray-500 font-bold mr-1" style={{ fontSize: 13 }}>Attach</span>
									<button
										type="button"
										{...getRootProps()}
										className={`inline-flex items-center cursor-pointer px-1 py-0.5 rounded-sm border border-transparent hover:bg-[#e7eaf0] ${isDragActive ? 'bg-blue-100 border-blue-400' : ''}`}
										style={{ transition: 'background 0.2s', borderRadius: 2 }}
									>
										<input {...getInputProps()} />
										Photo
									</button>
								</div>
								<Button
									className="bg-[#5b74a8] hover:bg-[#3b5998] text-white font-bold rounded-sm px-4 py-1 ml-2 shadow"
									onClick={handleShare}
									disabled={loading || (!inputValue.trim() && attachedImages.length === 0) || inputValue.length > 280}
									style={{ fontFamily: 'Tahoma, Geneva, Verdana, sans-serif', fontSize: 15 }}
								>
									{loading ? "Sharing..." : "Share"}
								</Button>
							</div>
							{attachedImages.length > 0 && (
								<div className="flex items-center gap-2 flex-wrap px-2 pb-2 pt-1">
									{attachedImages.map((img, i) => (
										<div key={i} className="relative group">
											<Image src={img} alt="Preview" width={64} height={64} className="w-16 h-16 object-cover border mb-1" style={{ borderRadius: 2 }} />
											<button
												type="button"
												className="absolute top-0 right-0 bg-white/80 text-xs text-red-700 px-1 py-0.5 border border-gray-300 rounded-none opacity-80 group-hover:opacity-100"
												onClick={() => setAttachedImages(prev => prev.filter((_, idx) => idx !== i))}
												style={{ fontFamily: 'Tahoma, Geneva, Verdana, sans-serif' }}
											>
												×
											</button>
										</div>
									))}
								</div>
							)}
							<span className="text-xs text-gray-500 mr-2">{inputValue.length}/280</span>
						</div>
						{/* Recent Activity */}
						<div className="bg-gray-50 border rounded p-2 text-xs mb-2">
							<div className="text-green-700 font-semibold">RECENT ACTIVITY</div>
							<div>
								Mark likes{' '}
								<a
									href="#"
									className="text-blue-700 hover:underline"
								>
									Nick Schrock&apos;s photo
								</a>
								.
							</div>
							<div>
								Mark likes{' '}
								<a
									href="#"
									className="text-blue-700 hover:underline"
								>
									Bubba Murarka&apos;s album Wall Photos
								</a>
								.
							</div>
						</div>
						{/* Wall Posts */}
						<div className="space-y-4">
							{posts.map((post, idx) => (
								<div key={post.id || idx} className="border-b pb-2 relative">
									<div className="flex gap-2 items-center mb-1">
										<div className="w-8 h-8 rounded overflow-hidden bg-gray-200">
											<Image
												src={profileImg}
												alt={post.user?.name || "Julqifhel"}
												width={32}
												height={32}
												className="object-cover w-full h-full"
											/>
										</div>
										<span className="font-semibold text-sm">{post.user?.name || "Julqifhel"}</span>
										<span className="text-xs text-gray-500 ml-2">
											{post.created_at ? new Date(post.created_at).toLocaleString() : ""}
										</span>
										<button
											className="ml-auto p-1 hover:bg-gray-200 rounded"
											onClick={() => setOpenMenuIdx(openMenuIdx === idx ? null : idx)}
											type="button"
											aria-label="Post options"
										>
											<DotsHorizontalIcon className="w-5 h-5" />
										</button>
										{openMenuIdx === idx && (
											<div className="absolute right-0 top-8 z-10 bg-white border shadow w-24">
												<button
													className="w-full text-left px-4 py-1 text-xs text-blue-700 hover:underline hover:bg-blue-50 border-t border-gray-200"
													onClick={() => {
														handleDeletePost(idx);
														setOpenMenuIdx(null);
													}}
													type="button"
													style={{ fontFamily: 'Tahoma, Geneva, Verdana, sans-serif', fontWeight: 400 }}
												>
													Remove Post
												</button>
											</div>
										)}
									</div>
									<div className="text-sm break-words whitespace-pre-line mb-1">
										{post.body}
									</div>
									{post.images && post.images.length > 0 && (
										<div className="mt-2">
											{post.images.map((img: string, i: number) => (
												<Image key={i} src={img} alt="attachment" width={128} height={128} className="w-32 h-32 object-cover rounded border mb-2" />
											))}
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				</main>
				{/* Right Sidebar (Ads/Extras) */}
				<aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
					<div className="bg-white shadow p-2 text-xs">
						<div className="font-semibold mb-1">Advertise</div>
						<div className="mb-1">Scuba Diving Vacations</div>
						<div className="mb-1">Hard Drive Imaging?</div>
						<div>Wedding Card Box</div>
					</div>
				</aside>
			</div>
		</div>
	);
}
