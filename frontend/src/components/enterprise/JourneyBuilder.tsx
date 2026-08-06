import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { djangoApi } from "@/platform/djangoAdapter";
import { platformClient } from "@/platform/track13/platformClient";
import { toast } from "sonner";

type Props = {
  defaultDatasetId?: string;
  onCreated?: () => void;
};

export function JourneyBuilder({ defaultDatasetId, onCreated }: Props) {
  const [name, setName] = useState("");
  const [stageColumn, setStageColumn] = useState("stage");
  const [stages, setStages] = useState("Lead,Sales,Payment");
  const [ownerDepartment, setOwnerDepartment] = useState("");
  const [journeyType, setJourneyType] = useState("customer");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const tenant = await djangoApi.ensureTenant();
      if (!tenant.data?.organizationId || !tenant.data.workspaceId) {
        throw new Error("Tenant required");
      }
      await platformClient.createJourney({
        organization_id: tenant.data.organizationId,
        workspace_id: tenant.data.workspaceId,
        name,
        journey_type: journeyType,
        ...(defaultDatasetId ? { dataset_id: defaultDatasetId } : {}),
        stage_column: stageColumn,
        stages: stages.split(",").map((s) => s.trim()).filter(Boolean),
        owner_department: ownerDepartment,
      });
      toast.success("Journey created");
      setName("");
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label>Journey name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sales pipeline" />
      </div>
      <div className="space-y-1">
        <Label>Type</Label>
        <Select value={journeyType} onValueChange={setJourneyType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="order">Order</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="ticket">Ticket</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Stage column</Label>
        <Input value={stageColumn} onChange={(e) => setStageColumn(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Stages (comma-separated)</Label>
        <Input value={stages} onChange={(e) => setStages(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Owner department</Label>
        <Input value={ownerDepartment} onChange={(e) => setOwnerDepartment(e.target.value)} placeholder="Sales" />
      </div>
      <div className="flex items-end">
        <Button onClick={create} disabled={!name.trim() || busy}>Create Journey</Button>
      </div>
    </div>
  );
}
