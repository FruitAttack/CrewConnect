import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../utils/ctx";
import { getForms } from "../../../utils/api";
import { colors, spacing, borderRadius, typography, shadows } from "../../../constants/theme";
import { useFormTab } from "../../components/formTabComponents/formTabContext";
import FormModal from "../../components/formComponents/formModal";
import { createForm, getForms as fetchFormsApi } from "../../../utils/api";

export default function FormsOverview() {
	const { session } = useSession();
	const token = session?.access_token;
	const { createOpen, setCreateOpen } = useFormTab();
	const [editOpen, setEditOpen] = useState(false);
	const [editingForm, setEditingForm] = useState(null);

	const [forms, setForms] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);

	const fetchForms = useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			const response = await fetchFormsApi(token, null);
			if (response.success && response.data?.forms) {
				setForms(response.data.forms);
			} else {
				setError(response.message || "Failed to load forms");
			}
		} catch (err) {
			setError("Failed to load forms");
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		fetchForms();
	}, [fetchForms]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchForms();
		setRefreshing(false);
	}, [fetchForms]);

	const totalForms = forms.length;
	const totalFields = forms.reduce((sum, f) => {
		const parsedFields = typeof f.fields === 'string' ? JSON.parse(f.fields || '[]') : (f.fields || []);
		return sum + (parsedFields?.length || 0);
	}, 0);
	const categories = Array.from(new Set(forms.map(f => f.category || "Uncategorized")));
	const groupedForms = categories.map((cat) => ({
		category: cat,
		forms: forms.filter((f) => (f.category || "Uncategorized") === cat),
	}));

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={colors.primary.orange} />
				<Text style={styles.loadingText}>Loading forms...</Text>
			</View>
		);
	}

	const handleCreate = async (newForm) => {
		setLoading(true);
		setCreateOpen(false);
		setError(null);
		try {
			const response = await createForm(token, newForm);
			if (response.success) {
				await fetchForms();
			} else {
				setError(response.message || "Failed to create form");
			}
		} catch (err) {
			setError("Failed to create form");
		} finally {
			setLoading(false);
		}
	};

	const handleEdit = (form) => {
		setEditingForm(form);
		setEditOpen(true);
	};

	const handleUpdate = async (updatedForm) => {
		setLoading(true);
		setEditOpen(false);
		setError(null);
		try {
			const response = await import("../../../utils/api").then(m => m.apiCall(`forms/${editingForm.id}`, token, "PUT", updatedForm));
			if (response.success) {
				await fetchForms();
			} else {
				setError(response.message || "Failed to update form");
			}
		} catch (err) {
			setError("Failed to update form");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		setLoading(true);
		setEditOpen(false);
		setError(null);
		try {
			const response = await import("../../../utils/api").then(m => m.apiCall(`forms/${editingForm.id}`, token, "DELETE"));
			if (response.success) {
				await fetchForms();
			} else {
				setError(response.message || "Failed to delete form");
			}
		} catch (err) {
			setError("Failed to delete form");
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.scrollContent}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />}
		>
			{/* Header */}
			<View style={styles.header}>
				<View>
					<Text style={styles.pageTitle}>Forms Management</Text>
					<Text style={styles.subtitle}>Manage templates and see key details from your library.</Text>
				</View>
			</View>

			{/* Stats Summary */}
			<View style={styles.statsRow}>
				<StatCard icon="folder-open" label="Forms" value={totalForms} bg={colors.primary.orangeSubtle} color={colors.primary.orange} />
				<StatCard icon="list" label="Total Fields" value={totalFields} bg={colors.semantic.infoLight} color={colors.semantic.info} />
				<StatCard icon="pricetag" label="Categories" value={categories.length} bg={colors.semantic.successLight} color={colors.semantic.success} />
			</View>

			{/* Error */}
			{error && (
				<View style={styles.errorContainer}>
					<Ionicons name="alert-circle" size={20} color={colors.semantic.error} />
					<Text style={styles.errorText}>{error}</Text>
					<Pressable style={styles.retryButton} onPress={fetchForms}>
						<Text style={styles.retryText}>Retry</Text>
					</Pressable>
				</View>
			)}

			{/* Empty */}
			{!error && forms.length === 0 && (
				<View style={styles.emptyState}>
					<Ionicons name="folder-open-outline" size={48} color={colors.text.tertiary} />
					<Text style={styles.emptyTitle}>No forms yet</Text>
					<Text style={styles.emptySubtitle}>Create a template to get started.</Text>
				</View>
			)}

						{/* Forms by Category */}
						{groupedForms.map(({ category, forms: catForms }) => (
							<View key={category} style={styles.categorySection}>
								<Text style={styles.categoryTitle}>{category}</Text>
								<View style={styles.formsGrid}>
									{catForms.map((form) => (
										<FormCard key={form.id} form={form} onEdit={handleEdit} />
									))}
								</View>
							</View>
						))}

						{/* Create Form Modal */}
						<FormModal
							mode="create"
							visible={createOpen}
							onClose={() => setCreateOpen(false)}
							token={token}
							onSubmit={handleCreate}
						/>
						{/* Edit Form Modal */}
						<FormModal
							mode="edit"
							visible={editOpen}
							onClose={() => setEditOpen(false)}
							token={token}
							initialFormData={editingForm}
							onSubmit={handleUpdate}
							onDelete={handleDelete}
						/>
		</ScrollView>
	);
}

function StatCard({ icon, label, value, bg, color }) {
	return (
		<View style={styles.statCard}>
			<View style={[styles.statIcon, { backgroundColor: bg }]}>
				<Ionicons name={icon} size={18} color={color} />
			</View>
			<View>
				<Text style={styles.statValue}>{value}</Text>
				<Text style={styles.statLabel}>{label}</Text>
			</View>
		</View>
	);
}

function FormCard({ form, onEdit }) {
	// Parse fields if it's a JSON string, otherwise use as-is
	const parsedFields = typeof form.fields === 'string' ? JSON.parse(form.fields || '[]') : (form.fields || []);
	const fieldCount = parsedFields?.length || 0;
	const fieldTypes = Array.from(new Set((parsedFields || []).map(f => f.type))).slice(0, 4);

	return (
		<View style={styles.formCard}>
			<View style={styles.cardHeader}>
				<View style={styles.headerLeft}>
					<View style={styles.iconCircle}>
						<Text style={styles.iconText}>{form.icon || "📄"}</Text>
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.formTitle} numberOfLines={1}>{form.title}</Text>
						<Text style={styles.formCategory}>{form.category || "Uncategorized"}</Text>
					</View>
				</View>
				<View style={styles.badge}><Text style={styles.badgeText}>{fieldCount} fields</Text></View>
			</View>

			<View style={styles.cardBody}>
				<Text style={styles.formDescription} numberOfLines={2}>{form.description}</Text>
				<View style={styles.metaRow}>
					<Ionicons name="funnel-outline" size={14} color={colors.text.tertiary} />
					<Text style={styles.metaText}>Key field types: {fieldTypes.join(", ") || "N/A"}</Text>
				</View>
			</View>

			<View style={styles.cardFooter}>
				<View style={styles.footerLeft}>
					<Ionicons name="pricetag-outline" size={14} color={colors.text.tertiary} />
					<Text style={styles.metaText}>{form.category || "Uncategorized"}</Text>
				</View>
				<Pressable style={styles.viewButton} onPress={() => onEdit(form)}>
					<Text style={styles.viewText}>Edit Form</Text>
					<Ionicons name="chevron-forward" size={14} color={colors.primary.orange} />
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8FAFC' },
	scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxl },

	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F8FAFC',
		padding: spacing.xxxxl,
	},
	loadingText: {
		marginTop: spacing.md,
		fontSize: typography.fontSize.md,
		color: colors.text.secondary,
	},

	header: { marginBottom: spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
	pageTitle: {
		fontSize: 28,
		fontWeight: typography.fontWeight.bold,
		color: colors.text.primary,
		letterSpacing: -0.5,
		marginBottom: spacing.xs,
	},
	subtitle: { fontSize: typography.fontSize.md, color: colors.text.secondary },

	statsRow: {
		flexDirection: 'row',
		gap: spacing.md,
		flexWrap: 'wrap',
		marginBottom: spacing.xl,
	},
	statCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.md,
		backgroundColor: colors.neutral.white,
		padding: spacing.md,
		borderRadius: borderRadius.lg,
		borderWidth: 1,
		borderColor: colors.border.light,
		minWidth: 180,
		flex: 1,
	},
	statIcon: {
		width: 42,
		height: 42,
		borderRadius: borderRadius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	statValue: {
		fontSize: typography.fontSize.xl,
		fontWeight: typography.fontWeight.bold,
		color: colors.text.primary,
	},
	statLabel: {
		fontSize: typography.fontSize.sm,
		color: colors.text.tertiary,
	},

	errorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		backgroundColor: colors.semantic.errorLight,
		padding: spacing.md,
		borderRadius: borderRadius.lg,
		marginBottom: spacing.lg,
	},
	errorText: { flex: 1, color: colors.semantic.error, fontSize: typography.fontSize.sm },
	retryButton: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		backgroundColor: colors.semantic.error,
		borderRadius: borderRadius.md,
	},
	retryText: { color: colors.neutral.white, fontWeight: typography.fontWeight.medium },

	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: spacing.xxxxl,
		backgroundColor: colors.neutral.white,
		borderRadius: borderRadius.xl,
		borderWidth: 1,
		borderColor: colors.border.light,
		marginBottom: spacing.lg,
	},
	emptyTitle: {
		fontSize: typography.fontSize.lg,
		fontWeight: typography.fontWeight.semibold,
		color: colors.text.primary,
		marginTop: spacing.sm,
	},
	emptySubtitle: { fontSize: typography.fontSize.md, color: colors.text.tertiary, marginTop: spacing.xs },

	categorySection: { marginBottom: spacing.xl },
	categoryTitle: {
		fontSize: typography.fontSize.sm,
		fontWeight: typography.fontWeight.semibold,
		color: colors.text.tertiary,
		textTransform: 'uppercase',
		letterSpacing: 1,
		marginBottom: spacing.md,
	},

	formsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.md,
	},

	formCard: {
		flex: 1,
		minWidth: 300,
		backgroundColor: colors.neutral.white,
		borderRadius: borderRadius.xl,
		borderWidth: 1,
		borderColor: colors.border.light,
		overflow: 'hidden',
		...shadows.sm,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: colors.border.light,
	},
	headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
	iconCircle: {
		width: 40,
		height: 40,
		borderRadius: borderRadius.full,
		backgroundColor: colors.neutral.offWhite,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconText: { fontSize: 20 },
	formTitle: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
	formCategory: { fontSize: typography.fontSize.sm, color: colors.text.tertiary },
	badge: {
		backgroundColor: colors.primary.orangeSubtle,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xxs,
		borderRadius: borderRadius.full,
	},
	badgeText: { color: colors.primary.orange, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.xs },

	cardBody: { padding: spacing.md, gap: spacing.xs },
	formDescription: { color: colors.text.secondary, fontSize: typography.fontSize.sm },
	metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
	metaText: { color: colors.text.tertiary, fontSize: typography.fontSize.sm },

	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: spacing.md,
		borderTopWidth: 1,
		borderTopColor: colors.border.light,
		backgroundColor: colors.neutral.offWhite,
	},
	footerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
	viewButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
	viewText: { color: colors.primary.orange, fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm },
});
